#!/usr/bin/env python3
"""Normal Android login + empty school-plan navigation. No business writes.

Uses the reviewed profile driver's credential, APK and in-memory UI boundaries.
This does not prove adding a programme, its quality, or cross-user isolation.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import signal
import sys

spec = importlib.util.spec_from_file_location("atlas_profile_driver", Path(__file__).with_name("android-profile-e2e.py"))
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)
BRANCH = "refs/heads/feature/native-school-applications-v1"
CHECKS = ("credentials_preflight", "release_package", "android_login", "account_identity",
          "applications_empty_zh", "school_plan_empty_zh", "return_to_applications",
          "applications_empty_en", "school_plan_empty_en", "chinese_restored",
          "cold_restart_school_plan", "final_sign_out", "emulator_session_removed")
NOT_RUN = ("add_application", "duplicate_application", "application_detail",
           "same_user_token_refresh_during_write", "cross_user_isolation",
           "real_school_quality", "material_upload", "physical_arm_device")


def report(status, checks, sha=None, apk_hash=None, failure=None, phase=None):
    data = {"status": status, "scope": "authenticated_empty_school_plan_read_only",
            "checks": [{"check": check, "status": "PASS" if check in checks else "NOT_RUN"} for check in CHECKS]
            + [{"check": check, "status": "NOT_RUN"} for check in NOT_RUN]}
    if sha and re.fullmatch(r"[0-9a-f]{40}", sha):
        data["sourceSha"] = sha
    if apk_hash and re.fullmatch(r"[0-9a-f]{64}", apk_hash):
        data["apkSha256"] = apk_hash
    if failure:
        data["failure"] = failure.code if failure.code in driver.FAILURES else "UNEXPECTED_FAILURE"
        data["reason"] = failure.reason
    if phase in driver.PHASES:
        data["phase"] = phase
    rendered = json.dumps(data, ensure_ascii=True, sort_keys=True)
    print(rendered, flush=True)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as output:
            output.write("```json\n" + rendered + "\n```\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preflight", action="store_true")
    parser.add_argument("--apk")
    args = parser.parse_args()
    checks, sha, apk_hash, failure, android, phase = set(), None, None, None, None, None
    email, password = "", ""
    try:
        sha = driver.context(BRANCH)
        email, password = driver.credentials()
        checks.add("credentials_preflight")
        if args.preflight:
            with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
                output.write("ready=true\n")
            report("PREFLIGHT_READY", checks, sha)
            return 0
        driver.require(bool(args.apk), "RELEASE_PACKAGE_INVALID")
        apk_hash = driver.verify_apk(args.apk)
        android = driver.Android()
        android.prepare(args.apk)
        checks.add("release_package")
        android.login(email, password)
        checks.add("android_login")
        android.account(email)
        checks.add("account_identity")
        android.tap("申请", tab=True)
        android.wait("还没有申请项目", timeout=75)
        checks.add("applications_empty_zh")
        android.tap("去选校")
        android.wait("还没有选校方案", timeout=75)
        android.wait("本版本可查看已有方案，不会自动生成或重新搜索院校。")
        checks.add("school_plan_empty_zh")
        android.tap("返回我的申请")
        android.wait("还没有申请项目")
        checks.add("return_to_applications")
        android.account(email)
        android.tap("Switch to English")
        android.tap("Applications", tab=True)
        android.wait("No applications yet", timeout=75)
        checks.add("applications_empty_en")
        android.tap("Choose a programme")
        android.wait("No school plan yet", timeout=75)
        checks.add("school_plan_empty_en")
        android.tap("Back to my applications")
        android.tap("Account", tab=True)
        android.tap("切换为简体中文")
        android.wait("完善留学档案")
        checks.add("chinese_restored")
        android.restart()
        android.home()
        android.tap("申请", tab=True)
        android.wait("还没有申请项目", timeout=75)
        android.tap("去选校")
        android.wait("还没有选校方案", timeout=75)
        checks.add("cold_restart_school_plan")
        android.tap("返回我的申请")
        android.logout(email)
        checks.add("final_sign_out")
    except driver.Failure as error:
        failure = error
        phase = android.phase if android else None
    except BaseException:
        failure = driver.Failure("UNEXPECTED_FAILURE")
        phase = android.phase if android else None
    finally:
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        if android:
            try:
                android.remove_session()
                if android.installed:
                    checks.add("emulator_session_removed")
            except BaseException:
                failure = failure or driver.Failure("EMULATOR_CLEANUP_FAILED")
        email, password = "", ""
    if failure:
        report("BLOCKED" if failure.blocked else "FAIL", checks, sha, apk_hash, failure, phase)
        return 2 if failure.blocked else 1
    driver.require(all(check in checks for check in CHECKS), "UNEXPECTED_FAILURE")
    report("PASS", checks, sha, apk_hash)
    return 0


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, driver.interrupted)
    signal.signal(signal.SIGINT, driver.interrupted)
    try:
        sys.exit(main())
    except BaseException as error:
        if isinstance(error, SystemExit):
            raise
        report("FAIL", set(), failure=driver.Failure("UNEXPECTED_FAILURE"))
        sys.exit(1)
