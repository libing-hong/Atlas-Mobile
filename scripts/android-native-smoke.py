#!/usr/bin/env python3
"""Anonymous release smoke on a disposable Android emulator, never a user phone.

No credentials, text input, registration submission, backend fixtures or login.
This verifies standalone bundled launch and Chinese auth navigation only. It
cannot pass authenticated profile, persistence, business parity or ARM-device
acceptance. Evidence excludes the APK and expires after one day in CI.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
import zipfile


PACKAGE = "com.libinghong.atlasmobile.preview"
REMOTE_XML = "/sdcard/atlas-native-smoke.xml"
FATAL = re.compile(
    r"Unable to load script|Could not connect to development server|"
    r"FATAL EXCEPTION|Fatal signal|Invariant Violation|ReferenceError:|TypeError:"
)


def command(*args, timeout=30, binary=False, check=True):
    result = subprocess.run(args, capture_output=True, timeout=timeout, check=False)
    if check and result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}): {args[0]}")
    return result.stdout if binary else result.stdout.decode("utf-8", errors="replace").strip()


def sdk_tool(name):
    sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if not sdk:
        raise RuntimeError("Android SDK location is unavailable")
    candidates = list((Path(sdk) / "build-tools").glob(f"*/{name}"))
    if not candidates:
        raise RuntimeError(f"Required Android build tool is missing: {name}")
    return str(sorted(candidates, key=lambda path: [int(n) for n in re.findall(r"\d+", path.parent.name)])[-1])


class Smoke:
    def __init__(self, output):
        self.output = output
        self.serial = "emulator-" + os.environ.get("EMULATOR_PORT", "5554")
        self.pids = set()
        self.checks = []
        self.last_xml = None
        self.device_verified = False
        self.launcher_recovery_attempted = False
        self.launcher_recovered = False

    def adb(self, *args, **kwargs):
        return command("adb", "-s", self.serial, *args, **kwargs)

    def record(self, check):
        self.checks.append({"check": check, "status": "PASS"})
        print("PASS:", check, flush=True)

    def read_hierarchy(self):
        self.adb("shell", "uiautomator", "dump", REMOTE_XML, timeout=20)
        xml = self.adb("exec-out", "cat", REMOTE_XML)
        if FATAL.search(xml):
            raise RuntimeError("Crash or missing-bundle error is visible")
        root = ET.fromstring(xml)
        self.last_xml = xml
        return root

    @staticmethod
    def launcher_close_button(root):
        # Only the observed emulator launcher ANR qualifies. Atlas errors and
        # every other system dialog continue to fail the original assertions.
        titles = [node for node in root.iter("node") if
                  node.get("package") == "android" and
                  node.get("resource-id") == "android:id/alertTitle" and
                  node.get("text") == "Pixel Launcher isn't responding"]
        if not titles:
            return None
        buttons = [node for node in root.iter("node") if
                   node.get("package") == "android" and
                   node.get("resource-id") == "android:id/aerr_close" and
                   node.get("class") == "android.widget.Button" and
                   node.get("text") == "Close app" and
                   node.get("clickable") == "true" and node.get("enabled") == "true"]
        if len(titles) != 1 or len(buttons) != 1:
            raise RuntimeError("The emulator launcher dialog is not uniquely identifiable")
        return buttons[0]

    def dump(self):
        root = self.read_hierarchy()
        button = self.launcher_close_button(root)
        if button is None:
            return root
        if self.launcher_recovery_attempted:
            raise RuntimeError("The emulator launcher became unresponsive more than once")
        self.launcher_recovery_attempted = True
        # Preserve the actual obstruction before interacting with it.
        self.capture("00-emulator-launcher-anr")
        coordinates = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", button.get("bounds", ""))
        if not coordinates:
            raise RuntimeError("The emulator launcher close control has no usable bounds")
        left, top, right, bottom = map(int, coordinates.groups())
        if not (0 <= left < right <= 1080 and 0 <= top < bottom <= 2400):
            raise RuntimeError("The emulator launcher close control is outside the viewport")
        self.adb("shell", "input", "tap", str((left + right) // 2), str((top + bottom) // 2))
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            root = self.read_hierarchy()
            if self.launcher_close_button(root) is None:
                self.launcher_recovered = True
                self.record("One identified Pixel Launcher ANR was closed; original App assertions remain required")
                return root
            time.sleep(0.5)
        raise RuntimeError("The identified emulator launcher dialog did not close")

    @staticmethod
    def find(root, label, input_only=False):
        for node in root.iter("node"):
            if node.get("package") != PACKAGE:
                continue
            if input_only and node.get("class") != "android.widget.EditText":
                continue
            if label in (node.get("text"), node.get("content-desc")):
                return node
        return None

    def visible(self, label, input_only=False, timeout=30):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            root = self.dump()
            node = self.find(root, label, input_only)
            if node is not None:
                return node
            time.sleep(0.5)
        raise RuntimeError(f"Required Chinese control did not appear: {label}")

    def scroll_to(self, label, input_only=False):
        for direction in ("down", "up"):
            for _ in range(6):
                node = self.find(self.dump(), label, input_only)
                if node is not None:
                    return node
                start, end = (1800, 600) if direction == "down" else (600, 1800)
                self.adb("shell", "input", "swipe", "540", str(start), "540", str(end), "300")
        raise RuntimeError(f"Required Chinese control is unreachable by scrolling: {label}")

    def tap_mode_switch(self, label):
        # Only these two navigation controls can ever receive a tap.
        if label not in {"还没有账号？注册新账号", "已有账号？返回登录"}:
            raise RuntimeError("Only anonymous auth-mode navigation is allowed")
        node = self.scroll_to(label)
        coordinates = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
        if not coordinates:
            raise RuntimeError("The auth navigation control has no usable bounds")
        left, top, right, bottom = map(int, coordinates.groups())
        if not (0 <= left < right <= 1080 and 0 <= top < bottom <= 2400):
            raise RuntimeError("Auth control bounds are outside the emulator viewport")
        self.adb("shell", "input", "tap", str((left + right) // 2), str((top + bottom) // 2))

    def capture(self, name):
        self.output.joinpath(name + ".png").write_bytes(self.adb("exec-out", "screencap", "-p", binary=True))
        if self.last_xml:
            self.output.joinpath(name + ".xml").write_text(self.last_xml, encoding="utf-8")

    def launch(self):
        result = self.adb("shell", "am", "start", "-W", "-n", PACKAGE + "/.MainActivity")
        if "Status: ok" not in result or "Error:" in result:
            raise RuntimeError("The installed release activity could not start")
        self.visible("欢迎使用 Atlas")
        pid = self.adb("shell", "pidof", PACKAGE)
        if not re.fullmatch(r"\d+", pid):
            raise RuntimeError("The Atlas process did not remain alive")
        self.pids.add(pid)

    def check_input(self, label, password=False):
        node = self.scroll_to(label, input_only=True)
        if node.get("enabled") != "true":
            raise RuntimeError(f"Required input is disabled: {label}")
        if password and node.get("password") != "true":
            raise RuntimeError(f"Password input is not protected: {label}")
        if node.get("text", ""):
            raise RuntimeError("Fresh emulator input unexpectedly contains a value")

    def collect_logs(self):
        logs = []
        for pid in sorted(self.pids):
            logs.append(self.adb("logcat", "-d", "--pid=" + pid, "-v", "threadtime", "-t", "200",
                                 "ReactNativeJS:V", "AndroidRuntime:E", "ReactNative:W", "*:S"))
        if not self.pids:
            # Fresh emulator, no account input; useful when the app crashes
            # before a PID can be recorded. Never collect from a user device.
            logs.append(self.adb("logcat", "-d", "-v", "threadtime", "-t", "100",
                                 "ReactNativeJS:V", "AndroidRuntime:E", "*:S"))
        text = "\n".join(logs)
        # No user values are entered. Still redact credential-shaped strings.
        text = re.sub(r"sb_(?:publishable|secret)_[A-Za-z0-9_-]+", "[REDACTED_KEY]", text)
        text = re.sub(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "[REDACTED_TOKEN]", text)
        self.output.joinpath("runtime.log").write_text(text[-40000:], encoding="utf-8")
        return text


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apk", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("artifacts/android-smoke"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    smoke = Smoke(args.output)
    evidence = {
        "status": "FAIL", "scope": "anonymous x86_64 Android release smoke only",
        "authenticatedProfile": "NOT_RUN", "hostedBusinessFlows": "NOT_RUN",
        "armDeviceInstall": "NOT_RUN", "credentialsEntered": False,
        "accountCreated": False, "apkDistributed": False, "checks": smoke.checks,
    }
    try:
        source_sha = command("git", "rev-parse", "HEAD")
        if not re.fullmatch(r"[0-9a-f]{40}", source_sha) or os.environ.get("GITHUB_SHA", source_sha) != source_sha:
            raise RuntimeError("Checked-out source does not match the workflow commit")
        evidence["sourceSha"] = source_sha
        with args.apk.open("rb") as apk_file:
            evidence["apkSha256"] = hashlib.file_digest(apk_file, "sha256").hexdigest()
        with zipfile.ZipFile(args.apk) as apk:
            if apk.getinfo("assets/index.android.bundle").file_size == 0:
                raise RuntimeError("The release APK contains an empty JavaScript bundle")
            evidence["nativeAbis"] = sorted({name.split("/")[1] for name in apk.namelist() if re.match(r"lib/[^/]+/.+\.so$", name)})
            if "x86_64" not in evidence["nativeAbis"]:
                raise RuntimeError("The release APK lacks x86_64 native libraries")
        command(sdk_tool("apksigner"), "verify", str(args.apk))
        badging = command(sdk_tool("aapt"), "dump", "badging", str(args.apk))
        if f"package: name='{PACKAGE}'" not in badging or "application-debuggable" in badging:
            raise RuntimeError("Expected a non-debuggable Atlas Preview release APK")
        evidence["package"] = PACKAGE
        smoke.record("Signed release APK contains its JavaScript bundle and emulator ABI")
        try:
            with socket.create_connection(("127.0.0.1", 8081), timeout=1):
                raise RuntimeError("Metro port 8081 is unexpectedly listening")
        except (ConnectionRefusedError, TimeoutError):
            pass
        if smoke.adb("shell", "getprop", "ro.kernel.qemu") != "1":
            raise RuntimeError("This smoke script only accepts a disposable emulator")
        smoke.device_verified = True
        if smoke.adb("reverse", "--list"):
            raise RuntimeError("Emulator has unexpected reverse tunnels")
        smoke.adb("shell", "svc", "wifi", "disable")
        smoke.adb("shell", "svc", "data", "disable")
        smoke.adb("shell", "cmd", "connectivity", "airplane-mode", "enable")
        if smoke.adb("shell", "settings", "get", "global", "airplane_mode_on") != "1":
            raise RuntimeError("Could not establish airplane mode for anonymous smoke")
        smoke.adb("shell", "wm", "size", "1080x2400")
        smoke.adb("shell", "wm", "density", "360")
        evidence["device"] = {"api": smoke.adb("shell", "getprop", "ro.build.version.sdk"),
                              "serial": smoke.serial, "airplaneMode": True, "metro": False}
        smoke.adb("install", "-r", str(args.apk), timeout=60)
        if smoke.adb("shell", "pm", "clear", PACKAGE) != "Success":
            raise RuntimeError("Could not establish fresh empty app storage")
        smoke.adb("logcat", "-c")
        smoke.launch()
        smoke.check_input("邮箱")
        smoke.check_input("密码", password=True)
        smoke.scroll_to("登录")
        smoke.capture("01-cold-launch-sign-in")
        smoke.record("Cold launch without Metro renders Chinese sign-in with empty editable inputs")
        smoke.tap_mode_switch("还没有账号？注册新账号")
        smoke.visible("确认密码", input_only=True)
        smoke.check_input("确认密码", password=True)
        smoke.scroll_to("密码需要 10–128 位。")
        smoke.capture("02-sign-up-confirm-password")
        smoke.record("Registration navigation exposes the protected confirmation field and password policy")
        smoke.tap_mode_switch("已有账号？返回登录")
        smoke.scroll_to("密码", input_only=True)
        if smoke.find(smoke.dump(), "确认密码", input_only=True) is not None:
            raise RuntimeError("Confirmation input remained after returning to sign-in")
        smoke.record("Returning to sign-in removes the registration confirmation input")
        smoke.adb("shell", "am", "force-stop", PACKAGE)
        smoke.launch()
        smoke.check_input("邮箱")
        smoke.check_input("密码", password=True)
        smoke.capture("03-reopened-sign-in")
        smoke.record("Force-stop and reopen restores the anonymous Chinese sign-in screen")
        if FATAL.search(smoke.collect_logs()):
            raise RuntimeError("Fatal Android or React Native error found in app logs")
        smoke.record("Observed app processes contain no fatal Android or React Native error")
        evidence["status"] = "PASS"
    except Exception as error:
        evidence["failure"] = str(error)[:500]
        print("FAIL:", evidence["failure"], file=sys.stderr, flush=True)
    finally:
        evidence["emulatorLauncherRecovered"] = smoke.launcher_recovered
        if smoke.device_verified:
            try:
                smoke.collect_logs()
                smoke.capture("final-screen")
            except Exception:
                pass
        args.output.joinpath("evidence.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if evidence["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
