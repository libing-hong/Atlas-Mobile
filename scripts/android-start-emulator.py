#!/usr/bin/env python3
"""Credential-free emulator startup; no raw logs or persistent diagnostics."""

import argparse
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import threading
import time

REPOSITORY = "libing-hong/Atlas-Mobile"
BRANCH = "refs/heads/feature/native-team-first-flow-v1"
SCHOOL_READ_BRANCH = "refs/heads/feature/native-school-applications-v1"
AVD = "atlas_profile_acceptance"
SERIAL = "emulator-5554"
SECRET_NAMES = ("ATLAS_PREVIEW_TEST_EMAIL", "ATLAS_PREVIEW_TEST_PASSWORD")
BUFFER_LIMIT = 256 * 1024
REASONS = (
    ("SHARED_LIBRARY_MISSING", (b"error while loading shared libraries", b"cannot open shared object file")),
    ("QT_PLATFORM_UNAVAILABLE", (b"could not load the qt platform plugin", b"no qt platform plugin could be initialized")),
    ("AVD_NOT_FOUND", (b"unknown avd name", b"could not find avd", b"cannot find avd")),
    ("SYSTEM_IMAGE_INVALID", (b"broken avd system path", b"cannot find system image", b"missing system image")),
    ("KVM_UNAVAILABLE", (b"could not access kvm", b"/dev/kvm: permission denied", b"kvm is not installed", b"requires hardware acceleration")),
    ("AVD_ALREADY_RUNNING", (b"running multiple emulators with the same avd", b"already running", b"address already in use")),
    ("GPU_INIT_FAILED", (b"failed to initialize opengl", b"failed to initialize vulkan", b"failed to initialize renderer")),
    ("INVALID_EMULATOR_OPTION", (b"unknown option", b"invalid command-line parameter")),
    ("DISK_SPACE", (b"no space left on device", b"not enough disk space", b"insufficient disk space")),
)
EXCEPTIONS = frozenset(("NONE", "INVALID_CONTEXT", "CONFIG_ERROR", "OS_ERROR",
                        "SUBPROCESS_TIMEOUT", "SUBPROCESS_EXIT", "EMULATOR_EXITED",
                        "BOOT_DEADLINE", "CLEANUP_FAILED", "INTERRUPTED", "UNEXPECTED"))


class StartFailure(Exception):
    def __init__(self, kind):
        self.kind = kind if kind in EXCEPTIONS else "UNEXPECTED"
        super().__init__(self.kind)


def child_environment():
    return {key: value for key, value in os.environ.items() if key not in SECRET_NAMES}


def check_context(expected_branch=BRANCH):
    if (sys.platform != "linux" or os.environ.get("GITHUB_ACTIONS") != "true"
            or os.environ.get("GITHUB_REPOSITORY") != REPOSITORY
            or expected_branch not in (BRANCH, SCHOOL_READ_BRANCH)
            or os.environ.get("GITHUB_REF") != expected_branch
            or any(os.environ.get(name) for name in SECRET_NAMES)):
        raise StartFailure("INVALID_CONTEXT")
    try:
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
        if event["repository"]["visibility"] != "public":
            raise StartFailure("INVALID_CONTEXT")
    except StartFailure:
        raise
    except Exception:
        raise StartFailure("INVALID_CONTEXT") from None


def stop_process(process):
    """Terminate only the process group created by this helper."""
    if process is None:
        return True
    try:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            pass
        # The launcher can exit before its child. Kill remaining group members,
        # not another emulator identified only by a shared port.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)
        return True
    except Exception:
        return False


def interrupted(_signum, _frame):
    raise StartFailure("INTERRUPTED")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preflight", action="store_true")
    parser.add_argument("--expected-branch", choices=(BRANCH, SCHOOL_READ_BRANCH), default=BRANCH)
    args = parser.parse_args()
    started = time.monotonic()
    phase = "CONFIG"
    process = reader = None
    captured = bytearray()
    reader_failed = threading.Event()
    boot_timeouts = 0
    last_adb_return_code = None
    emulator_return_code = None
    exception_kind = "NONE"
    boot_completed = False
    cleanup_ok = True

    def drain():
        try:
            while True:
                chunk = process.stdout.read(8192)
                if not chunk:
                    return
                remaining = BUFFER_LIMIT - len(captured)
                if remaining > 0:
                    captured.extend(chunk[:remaining])
                # Continue draining after the cap; never keep or print excess.
        except Exception:
            reader_failed.set()

    try:
        check_context(args.expected_branch)
        sdk_text = os.environ.get("ANDROID_HOME", "")
        temp_text = os.environ.get("RUNNER_TEMP", "")
        if not Path(sdk_text).is_absolute() or not Path(temp_text).is_absolute():
            raise StartFailure("CONFIG_ERROR")
        sdk = Path(sdk_text)
        config = Path(temp_text) / "atlas-profile-avd" / "config.ini"
        if not config.is_file():
            raise StartFailure("CONFIG_ERROR")
        # Keep these fixed settings identical for preflight and real startup.
        keys = ("hw.keyboard=", "hw.ramSize=", "hw.cpu.ncore=")
        lines = [line for line in config.read_text().splitlines()
                 if not line.strip().startswith(keys)]
        config.write_text("\n".join(lines + ["hw.keyboard=yes", "hw.ramSize=3072", "hw.cpu.ncore=2"]) + "\n")
        adb = [str(sdk / "platform-tools" / "adb"), "-s", SERIAL]
        phase = "LAUNCH"
        process = subprocess.Popen([
            str(sdk / "emulator" / "emulator"), "-avd", AVD,
            "-port", "5554", "-no-window", "-gpu", "swiftshader_indirect",
            "-accel", "on", "-no-snapshot", "-noaudio", "-no-boot-anim",
            "-camera-back", "none",
        ], stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE if args.preflight else subprocess.DEVNULL,
            stderr=subprocess.STDOUT if args.preflight else subprocess.DEVNULL,
            env=child_environment(), start_new_session=True)
        if args.preflight:
            reader = threading.Thread(target=drain, daemon=True)
            reader.start()
        phase = "BOOT_WAIT"
        deadline = time.monotonic() + 300
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise StartFailure("EMULATOR_EXITED")
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            try:
                boot = subprocess.run(adb + ["shell", "getprop", "sys.boot_completed"],
                                      capture_output=True, timeout=min(15, remaining),
                                      env=child_environment(), check=False)
                last_adb_return_code = boot.returncode
                if boot.returncode == 0 and boot.stdout.strip() == b"1":
                    boot_completed = True
                    break
            except subprocess.TimeoutExpired:
                boot_timeouts += 1
            time.sleep(min(2, max(0, deadline - time.monotonic())))
        if not boot_completed:
            raise StartFailure("BOOT_DEADLINE")
        phase = "ANIMATION_SETUP"
        for setting in ("window_animation_scale", "transition_animation_scale", "animator_duration_scale"):
            result = subprocess.run(adb + ["shell", "settings", "put", "global", setting, "0"],
                                    capture_output=True, timeout=15,
                                    env=child_environment(), check=False)
            last_adb_return_code = result.returncode
            if result.returncode != 0:
                raise StartFailure("SUBPROCESS_EXIT")
        phase = "UNLOCK"
        result = subprocess.run(adb + ["shell", "wm", "dismiss-keyguard"],
                                capture_output=True, timeout=15,
                                env=child_environment(), check=False)
        last_adb_return_code = result.returncode
        if result.returncode != 0:
            raise StartFailure("SUBPROCESS_EXIT")
        if process.poll() is not None:
            raise StartFailure("EMULATOR_EXITED")
    except StartFailure as error:
        exception_kind = error.kind
    except subprocess.TimeoutExpired:
        exception_kind = "SUBPROCESS_TIMEOUT"
    except OSError:
        exception_kind = "OS_ERROR"
    except BaseException:
        exception_kind = "UNEXPECTED"
    finally:
        # Preserve the startup result separately from intentional cleanup signals.
        emulator_return_code = process.poll() if process is not None else None
        # Cleanup is bounded even if Actions is cancelling the job.
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        if args.preflight or exception_kind != "NONE":
            cleanup_ok = stop_process(process)
            if reader is not None:
                reader.join(timeout=5)
                cleanup_ok = cleanup_ok and not reader.is_alive() and not reader_failed.is_set()
                if not reader.is_alive() and process.stdout is not None:
                    process.stdout.close()
            if not cleanup_ok and exception_kind == "NONE":
                phase = "CLEANUP"
                exception_kind = "CLEANUP_FAILED"

    reason = "NONE" if exception_kind == "NONE" else "UNKNOWN"
    if exception_kind != "NONE" and args.preflight:
        lower = bytes(captured).lower()
        reason = next((name for name, patterns in REASONS if any(pattern in lower for pattern in patterns)), "UNKNOWN")
    report = {
        "status": "PASS" if exception_kind == "NONE" else "BLOCKED",
        "phase": phase,
        "reason": reason,
        "exceptionKind": exception_kind,
        "emulatorReturnCode": emulator_return_code,
        "lastAdbReturnCode": last_adb_return_code,
        "bootProbeTimeoutCount": boot_timeouts,
        "elapsedSeconds": round(time.monotonic() - started, 1),
        "bootCompleted": boot_completed,
        "cleanupConfirmed": cleanup_ok if args.preflight or exception_kind != "NONE" else None,
        "mode": "preflight" if args.preflight else "start",
    }
    if exception_kind != "NONE":
        report["failure"] = "EMULATOR_START_FAILED"
    print(json.dumps(report, sort_keys=True), flush=True)
    return 0 if exception_kind == "NONE" else 2


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    sys.exit(main())
