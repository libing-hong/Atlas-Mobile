#!/usr/bin/env python3
"""Real Android UI profile acceptance; no API shortcuts or private artifacts.

Credentials exist in this process's memory only, and are entered as fixed Android
key codes (never as shell text/arguments). UI hierarchies are streamed to memory.
Only this designated synthetic fixture can be edited: GPA 85 -> 84 -> 85.
This source is a prepared test, not evidence that authenticated E2E has run.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import socket
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
import zipfile


PACKAGE = "com.libinghong.atlasmobile.preview"
REPOSITORY = "libing-hong/Atlas-Mobile"
BRANCH = "refs/heads/feature/native-team-first-flow-v1"
SECRET_NAMES = ("ATLAS_PREVIEW_TEST_EMAIL", "ATLAS_PREVIEW_TEST_PASSWORD")
INSTITUTION = "Atlas 流程测试大学（虚构）"
MAJOR = "工商管理（流程测试）"
ORIGINAL_GPA = "85"
SYNTHETIC_GPA = "84"
INTAKE_YEAR = "2027"
SAVED = "已保存到你的测试档案。首页的下一步会根据服务器最新结果更新。"
CHECKS = (
    "credentials_preflight", "release_package", "android_login", "account_identity",
    "synthetic_fixture", "profile_read", "profile_save", "home_refresh",
    "cold_restart_readback", "invalid_year_rejected", "invalid_year_not_persisted",
    "original_gpa_restored", "sign_out", "sign_in_again", "restored_profile_readback",
    "final_sign_out", "emulator_session_removed",
)
NOT_RUN = ("cross_user_isolation", "registration_email", "recommendations",
           "documents_applications_journey_full_business", "physical_arm_device")
FAILURES = frozenset((
    "MISSING_TEST_CREDENTIALS", "CREDENTIAL_INPUT_UNSUPPORTED", "CONTEXT_NOT_ALLOWED",
    "DEBUG_LOGGING_NOT_ALLOWED", "SOURCE_SHA_MISMATCH", "FIXTURE_NOT_PREPARED",
    "ADB_UNAVAILABLE", "NOT_AN_EMULATOR", "METRO_OR_REVERSE_PRESENT",
    "RELEASE_PACKAGE_INVALID", "ADB_OPERATION_FAILED", "UI_DUMP_UNAVAILABLE",
    "UI_ELEMENT_NOT_FOUND", "UI_ACTION_DISABLED", "UI_INPUT_MISMATCH",
    "PASSWORD_FIELD_NOT_SECURE", "LOGIN_NOT_CONFIRMED", "ACCOUNT_IDENTITY_MISMATCH",
    "HOME_DATA_NOT_READY", "SAVE_NOT_CONFIRMED", "PROFILE_READBACK_MISMATCH",
    "INVALID_YEAR_NOT_REJECTED", "INVALID_YEAR_WAS_PERSISTED", "LOGOUT_NOT_CONFIRMED",
    "SYNTHETIC_GPA_MAY_REMAIN", "EMULATOR_CLEANUP_FAILED", "INTERRUPTED",
    "UNEXPECTED_FAILURE", "KEYBOARD_STATE_UNKNOWN", "SYSTEM_LAUNCHER_ANR",
))


class Failure(Exception):
    def __init__(self, code, blocked=False):
        self.code = code if code in FAILURES else "UNEXPECTED_FAILURE"
        self.blocked = blocked
        super().__init__(self.code)


def require(condition, code, blocked=False):
    if not condition:
        raise Failure(code, blocked)


def clean_environment():
    # Child tools never inherit the two credentials, including adb/Java tools.
    return {key: value for key, value in os.environ.items() if key not in SECRET_NAMES}


def command(args, code="ADB_OPERATION_FAILED", timeout=35):
    try:
        result = subprocess.run(args, capture_output=True, timeout=timeout,
                                env=clean_environment(), check=False)
    except Exception:
        raise Failure(code) from None
    require(result.returncode == 0, code)
    # No command arguments, output, stderr or exception text reaches reporting.
    return result.stdout


def keycodes(value):
    plain = {" ": "SPACE", "-": "MINUS", "=": "EQUALS", "[": "LEFT_BRACKET",
             "]": "RIGHT_BRACKET", "\\": "BACKSLASH", ";": "SEMICOLON",
             "'": "APOSTROPHE", ",": "COMMA", ".": "PERIOD", "/": "SLASH", "`": "GRAVE"}
    shifted = dict(zip('!@#$%^&*()_+{}|:"<>?~', '1234567890-=[]\\;\',./`'))
    result = []
    for char in value:
        shift = char in shifted or "A" <= char <= "Z"
        base = shifted.get(char, char).lower()
        if "a" <= base <= "z" or "0" <= base <= "9":
            key = base.upper()
        elif base in plain:
            key = plain[base]
        else:
            raise Failure("CREDENTIAL_INPUT_UNSUPPORTED", True)
        result.append(("KEYCODE_SHIFT_LEFT", "KEYCODE_" + key) if shift else ("KEYCODE_" + key,))
    return result


def context():
    require(os.environ.get("GITHUB_ACTIONS") == "true"
            and os.environ.get("GITHUB_REPOSITORY") == REPOSITORY
            and os.environ.get("GITHUB_REF") == BRANCH, "CONTEXT_NOT_ALLOWED", True)
    try:
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
        require(event["repository"]["visibility"] == "public", "CONTEXT_NOT_ALLOWED", True)
    except Failure:
        raise
    except Exception:
        raise Failure("CONTEXT_NOT_ALLOWED", True) from None
    require(os.environ.get("RUNNER_DEBUG") != "1"
            and os.environ.get("ACTIONS_STEP_DEBUG", "").lower() != "true",
            "DEBUG_LOGGING_NOT_ALLOWED", True)
    sha = os.environ.get("GITHUB_SHA", "")
    require(re.fullmatch(r"[0-9a-f]{40}", sha) is not None, "SOURCE_SHA_MISMATCH", True)
    actual = command(["git", "rev-parse", "HEAD"], "SOURCE_SHA_MISMATCH").decode().strip()
    require(actual == sha, "SOURCE_SHA_MISMATCH", True)
    return sha


def credentials():
    email, password = (os.environ.get(name, "") for name in SECRET_NAMES)
    require(bool(email) and bool(password), "MISSING_TEST_CREDENTIALS", True)
    require(email == email.strip() and len(email) <= 254 and len(password) <= 256,
            "CREDENTIAL_INPUT_UNSUPPORTED", True)
    keycodes(email)
    keycodes(password)
    return email, password


def report(status, checks, code=None, source_sha=None, apk_hash=None):
    # Explicit allowlists prevent a future call site from logging UI/user data.
    status = status if status in ("PASS", "FAIL", "BLOCKED", "PREFLIGHT_READY") else "FAIL"
    rows = [{"check": name, "status": "PASS" if name in checks else "NOT_RUN"} for name in CHECKS]
    rows.extend({"check": name, "status": "NOT_RUN"} for name in NOT_RUN)
    data = {"status": status, "checks": rows}
    if code:
        data["failure"] = code if code in FAILURES else "UNEXPECTED_FAILURE"
    if source_sha and re.fullmatch(r"[0-9a-f]{40}", source_sha):
        data["sourceSha"] = source_sha
    if apk_hash and re.fullmatch(r"[0-9a-f]{64}", apk_hash):
        data["apkSha256"] = apk_hash
    rendered = json.dumps(data, ensure_ascii=True, sort_keys=True)
    print(rendered, flush=True)
    # This is the only persisted report; it contains no UI, email or credential.
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        try:
            with open(summary, "a", encoding="utf-8") as handle:
                handle.write("```json\n" + rendered + "\n```\n")
        except Exception:
            pass


class Android:
    def __init__(self):
        port = os.environ.get("EMULATOR_PORT", "5554")
        require(re.fullmatch(r"[0-9]{4,5}", port) is not None, "ADB_UNAVAILABLE")
        self.prefix = ["adb", "-s", "emulator-" + port]
        self.installed = False

    def adb(self, *args, code="ADB_OPERATION_FAILED", timeout=35):
        return command(self.prefix + list(args), code, timeout)

    def shell(self, *args, **kwargs):
        return self.adb("shell", *args, **kwargs)

    def prepare(self, apk):
        require(self.shell("getprop", "ro.kernel.qemu").strip() == b"1", "NOT_AN_EMULATOR")
        require(not self.adb("reverse", "--list").strip(), "METRO_OR_REVERSE_PRESENT")
        with socket.socket() as probe:
            probe.settimeout(1)
            require(probe.connect_ex(("127.0.0.1", 8081)) != 0, "METRO_OR_REVERSE_PRESENT")
        self.adb("install", "-r", apk, code="RELEASE_PACKAGE_INVALID", timeout=120)
        self.installed = True
        self.shell("pm", "clear", PACKAGE)
        self.shell("wm", "size", "1080x2400")
        self.shell("wm", "density", "360")
        self.shell("settings", "put", "secure", "show_ime_with_hard_keyboard", "1")
        self.restart()

    def restart(self):
        self.shell("am", "force-stop", PACKAGE)
        self.shell("am", "start", "-n", PACKAGE + "/.MainActivity")
        time.sleep(1)

    def tree(self):
        # FileWriter targets the shell process's stdout descriptor. Do NOT add
        # a /sdcard XML fallback: even transient private XML must stay in memory.
        raw = self.adb("exec-out", "uiautomator", "dump", "--compressed", "/proc/self/fd/1",
                       code="UI_DUMP_UNAVAILABLE", timeout=25)
        start, end = raw.find(b"<?xml"), raw.rfind(b"</hierarchy>")
        require(0 <= start < end and len(raw) < 2_000_000, "UI_DUMP_UNAVAILABLE")
        try:
            root = ET.fromstring(raw[start:end + len(b"</hierarchy>")])
        except Exception:
            raise Failure("UI_DUMP_UNAVAILABLE") from None
        launcher_anr = any(node.get("package") == "android"
                           and node.get("resource-id") == "android:id/alertTitle"
                           and node.get("text") == "Pixel Launcher isn't responding"
                           for node in root.iter("node"))
        require(not launcher_anr, "SYSTEM_LAUNCHER_ANR", True)
        return root

    @staticmethod
    def bounds(node):
        match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
        if not match:
            return None
        left, top, right, bottom = map(int, match.groups())
        return (left, top, right, bottom) if right > left and bottom > top else None

    def find(self, tree, label, field=False, tab=False):
        matches = []
        for node in tree.iter("node"):
            if node.get("package") != PACKAGE or not self.bounds(node):
                continue
            text, desc = node.get("text", ""), node.get("content-desc", "")
            if field:
                valid = desc == label and node.get("class", "").endswith("EditText")
            else:
                valid = text == label or desc == label
            if valid and (not tab or self.bounds(node)[1] >= 1950):
                matches.append(node)
        return max(matches, key=lambda node: self.bounds(node)[1]) if matches else None

    def wait(self, label, code="UI_ELEMENT_NOT_FOUND", timeout=45, field=False):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            found = self.find(self.tree(), label, field=field)
            if found is not None:
                return found
            time.sleep(0.4)
        raise Failure(code)

    def hide_keyboard(self):
        state = self.shell("dumpsys", "input_method")
        shown = re.search(rb"(?:mInputShown|mIsInputViewShown)\s*=\s*true", state)
        known = re.search(rb"(?:mInputShown|mIsInputViewShown)\s*=\s*(true|false)", state)
        require(known is not None, "KEYBOARD_STATE_UNKNOWN")
        if shown:
            self.shell("input", "keyevent", "KEYCODE_BACK")
            time.sleep(0.2)

    def swipe(self, down=False):
        self.hide_keyboard()
        self.shell("input", "swipe", "970", "650" if down else "1850",
                   "970", "1850" if down else "650", "250")

    def locate(self, label, field=False, tab=False):
        self.hide_keyboard()
        for direction, count in ((False, 1), (True, 6), (False, 10)):
            for _ in range(count):
                found = self.find(self.tree(), label, field=field, tab=tab)
                if found is not None:
                    return found
                if tab:
                    break
                self.swipe(down=direction)
        raise Failure("UI_ELEMENT_NOT_FOUND")

    def tap_node(self, node):
        require(node.get("enabled") != "false", "UI_ACTION_DISABLED")
        left, top, right, bottom = self.bounds(node)
        self.shell("input", "tap", str((left + right) // 2), str((top + bottom) // 2))
        time.sleep(0.2)

    def tap(self, label, tab=False):
        self.tap_node(self.locate(label, tab=tab))

    def value(self, label):
        return self.locate(label, field=True).get("text", "")

    def fill(self, label, value, secure=False):
        sequence = keycodes(value)
        node = self.locate(label, field=True)
        if secure:
            require(node.get("password") == "true", "PASSWORD_FIELD_NOT_SECURE")
        self.tap_node(node)
        # Fixed keycodes only; no secret or UI text appears in process argv.
        self.shell("input", "keyevent", "KEYCODE_MOVE_END")
        self.shell("input", "keyevent", *(["KEYCODE_DEL"] * 258))
        if not secure:
            current = self.find(self.tree(), label, field=True)
            require(current is not None and current.get("text", "") == "", "UI_INPUT_MISMATCH")
        for keys in sequence:
            operation = "keycombination" if len(keys) > 1 else "keyevent"
            self.shell("input", operation, *keys)
        if not secure:
            current = self.find(self.tree(), label, field=True)
            require(current is not None and current.get("text", "") == value, "UI_INPUT_MISMATCH")
        self.hide_keyboard()

    def login(self, email, password):
        self.wait("欢迎使用 Atlas", "LOGIN_NOT_CONFIRMED")
        self.fill("邮箱", email)
        self.fill("密码", password, secure=True)
        self.tap("登录")
        self.wait("你的下一步", "LOGIN_NOT_CONFIRMED", timeout=75)

    def home(self):
        self.wait("你的下一步", "HOME_DATA_NOT_READY")
        self.wait("当前事项", "HOME_DATA_NOT_READY", timeout=75)

    def account(self, email):
        self.tap("账户", tab=True)
        self.wait("完善留学档案", timeout=60)
        # Compare designated account in memory. Never report the read value.
        self.wait(email, "ACCOUNT_IDENTITY_MISMATCH", timeout=20)

    def profile(self, email):
        self.account(email)
        self.tap("完善留学档案")
        self.wait("我的留学档案")
        # A heading alone is not proof that the remote profile loaded.
        self.wait("教育背景", timeout=60)
        self.locate("就读院校", field=True)

    def fixture(self, expected_gpa):
        require(self.value("就读院校") == INSTITUTION
                and self.value("当前专业") == MAJOR
                and self.value("GPA / 平均分") == expected_gpa,
                "FIXTURE_NOT_PREPARED", True)
        graduation = self.value("毕业或预计毕业年份")
        require(graduation == "" or re.fullmatch(r"[0-9]{4}", graduation) is not None,
                "FIXTURE_NOT_PREPARED", True)
        self.tap("下一步")
        require(self.value("计划入学年份") == INTAKE_YEAR, "FIXTURE_NOT_PREPARED", True)
        self.tap("上一步")
        return graduation

    def save(self):
        self.tap("保存草稿")
        self.wait(SAVED, "SAVE_NOT_CONFIRMED", timeout=75)
        self.wait("查看更新后的下一步", "SAVE_NOT_CONFIRMED")

    def logout(self, email):
        self.account(email)
        self.tap("退出登录")
        self.wait("欢迎使用 Atlas", "LOGOUT_NOT_CONFIRMED", timeout=60)

    def remove_session(self):
        if self.installed:
            self.shell("am", "force-stop", PACKAGE, code="EMULATOR_CLEANUP_FAILED")
            require(self.shell("pm", "clear", PACKAGE, code="EMULATOR_CLEANUP_FAILED").strip() == b"Success",
                    "EMULATOR_CLEANUP_FAILED")


def verify_apk(apk):
    path = Path(apk)
    require(path.is_file(), "RELEASE_PACKAGE_INVALID")
    with zipfile.ZipFile(path) as archive:
        require(archive.getinfo("assets/index.android.bundle").file_size > 1000
                and any(name.startswith("lib/x86_64/") for name in archive.namelist()),
                "RELEASE_PACKAGE_INVALID")
    sdk = Path(os.environ.get("ANDROID_HOME", os.environ.get("ANDROID_SDK_ROOT", "")))
    versions = sorted((sdk / "build-tools").glob("*"))
    require(bool(versions), "RELEASE_PACKAGE_INVALID")
    build_tools = versions[-1]
    command([str(build_tools / "apksigner"), "verify", str(path)], "RELEASE_PACKAGE_INVALID")
    badging = command([str(build_tools / "aapt"), "dump", "badging", str(path)], "RELEASE_PACKAGE_INVALID")
    require(("package: name='" + PACKAGE + "'").encode() in badging
            and b"application-debuggable" not in badging, "RELEASE_PACKAGE_INVALID")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def restore(android, email, password, original_year):
    # A timed-out save might have committed. Discard only local edits by cold
    # restart, read server state, then restore through the same normal UI.
    android.restart()
    root = android.tree()
    if android.find(root, "欢迎使用 Atlas") is not None:
        android.login(email, password)
    android.wait("你的下一步", "LOGIN_NOT_CONFIRMED", timeout=75)
    android.profile(email)
    current = android.value("GPA / 平均分")
    require(current in (ORIGINAL_GPA, SYNTHETIC_GPA), "SYNTHETIC_GPA_MAY_REMAIN")
    # Refuse to overwrite if this no longer looks like the designated fixture.
    current_year = android.fixture(current)
    require(current_year in (original_year, "1900"), "SYNTHETIC_GPA_MAY_REMAIN")
    if current != ORIGINAL_GPA or current_year != original_year:
        android.fill("GPA / 平均分", ORIGINAL_GPA)
        if current_year != original_year:
            android.fill("毕业或预计毕业年份", original_year)
        android.save()
    android.restart()
    android.wait("你的下一步", timeout=75)
    android.profile(email)
    require(android.fixture(ORIGINAL_GPA) == original_year, "SYNTHETIC_GPA_MAY_REMAIN")
    # Leave profile before the caller exercises the Account tab.
    android.tap("返回")


def interrupted(_signum, _frame):
    raise Failure("INTERRUPTED")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preflight", action="store_true")
    parser.add_argument("--apk")
    args = parser.parse_args()
    checks, sha, apk_hash, failure = set(), None, None, None
    android, restore_required, original_year = None, False, None
    email, password = "", ""
    try:
        sha = context()
        email, password = credentials()
        checks.add("credentials_preflight")
        if args.preflight:
            # Only a boolean is written here, never a secret or derived value.
            with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
                output.write("ready=true\n")
            report("PREFLIGHT_READY", checks, source_sha=sha)
            return 0  # Preflight succeeded; authenticated checks remain NOT_RUN.
        require(bool(args.apk), "RELEASE_PACKAGE_INVALID")
        apk_hash = verify_apk(args.apk)
        android = Android()
        android.prepare(args.apk)
        checks.add("release_package")
        android.login(email, password)
        checks.add("android_login")
        android.profile(email)
        checks.add("account_identity")
        original_year = android.fixture(ORIGINAL_GPA)
        checks.update(("synthetic_fixture", "profile_read"))
        android.fill("GPA / 平均分", SYNTHETIC_GPA)
        restore_required = True  # Set BEFORE tap: transport failure can still commit.
        android.save()
        require(android.value("GPA / 平均分") == SYNTHETIC_GPA, "PROFILE_READBACK_MISMATCH")
        checks.add("profile_save")
        android.tap("查看更新后的下一步")
        android.home()
        checks.add("home_refresh")
        android.restart()
        android.home()
        android.profile(email)
        require(android.fixture(SYNTHETIC_GPA) == original_year, "PROFILE_READBACK_MISMATCH")
        checks.add("cold_restart_readback")
        android.fill("毕业或预计毕业年份", "1900")
        android.tap("保存草稿")
        android.wait("请检查以下项目后再保存：", "INVALID_YEAR_NOT_REJECTED", timeout=75)
        require(android.value("毕业或预计毕业年份") == "1900", "INVALID_YEAR_NOT_REJECTED")
        checks.add("invalid_year_rejected")
        android.restart()
        android.wait("你的下一步", timeout=75)
        android.profile(email)
        require(android.fixture(SYNTHETIC_GPA) == original_year, "INVALID_YEAR_WAS_PERSISTED")
        checks.add("invalid_year_not_persisted")
        restore(android, email, password, original_year)
        restore_required = False
        checks.add("original_gpa_restored")
        android.logout(email)
        checks.add("sign_out")
        android.login(email, password)
        checks.add("sign_in_again")
        android.profile(email)
        require(android.fixture(ORIGINAL_GPA) == original_year, "PROFILE_READBACK_MISMATCH")
        checks.add("restored_profile_readback")
        android.tap("返回")
        android.logout(email)
        checks.add("final_sign_out")
    except Failure as error:
        failure = error
    except BaseException:
        # Suppress traceback, raw exception, process args, hierarchy and logcat.
        failure = Failure("UNEXPECTED_FAILURE")
    finally:
        # Allow bounded cleanup after SIGTERM; force termination/runner loss can
        # still prevent restoration, so no workflow cancellation implies PASS.
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        if restore_required and android is not None:
            try:
                restore(android, email, password, original_year)
                checks.add("original_gpa_restored")
            except BaseException:
                failure = Failure("SYNTHETIC_GPA_MAY_REMAIN")
        if android is not None:
            try:
                android.remove_session()
                if android.installed:
                    checks.add("emulator_session_removed")
            except BaseException:
                if failure is None:
                    failure = Failure("EMULATOR_CLEANUP_FAILED")
        if args.preflight and failure:
            try:
                with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
                    output.write("ready=false\n")
            except Exception:
                pass
        email, password = "", ""
    if failure:
        report("BLOCKED" if failure.blocked else "FAIL", checks, failure.code, sha, apk_hash)
        return 2 if failure.blocked else 1
    require(all(name in checks for name in CHECKS), "UNEXPECTED_FAILURE")
    report("PASS", checks, source_sha=sha, apk_hash=apk_hash)
    return 0


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        sys.exit(main())
    except Failure as error:
        report("BLOCKED" if error.blocked else "FAIL", set(), error.code)
        sys.exit(2 if error.blocked else 1)
    except BaseException as error:
        if isinstance(error, SystemExit):
            raise
        report("FAIL", set(), "UNEXPECTED_FAILURE")
        sys.exit(1)
