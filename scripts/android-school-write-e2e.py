#!/usr/bin/env python3
"""One synthetic pending programme added through the real Chinese Android UI.

The HTTP sidecar uses normal password auth for GET-only corroboration; it never
creates an application or injects a token into the app. All identities, tokens
and UI hierarchies stay in memory. The coordinator owns fixture DB cleanup.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import signal
import sys
import zipfile


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


driver = module("atlas_android_profile", "android-profile-e2e.py")
hosted = module("atlas_hosted_school_write", "hosted-school-write-e2e.py")
read = hosted.read
CHECKS = ("context", "target", "fixture_guard", "credentials_preflight", "release_package",
          "android_login", "account_identity", "read_session_identity", "fixture_baseline",
          "school_plan_zh", "programme_pending_zh", "ui_add_once", "application_detail_zh",
          "pending_requirements_zh", "first_canonical_readback", "existing_selection_zh",
          "revisit_same_application", "cold_restart_detail_zh", "cold_restart_same_application",
          "final_sign_out", "read_session_logout_local", "emulator_session_removed")
NOT_RUN = ("duplicate_post", "database_row_assertions", "database_fixture_cleanup",
           "positive_material_initialization", "hosted_partial_initialization", "cross_user_isolation",
           "real_school_recommendation", "material_upload", "full_business_journey", "physical_arm_device")
WRITE_STATES = ("NOT_ATTEMPTED", "UI_ADD_ATTEMPTED_UNCONFIRMED", "UI_ADD_CONFIRMED")


class ReadbackClient(hosted.Client):
    def request(self, route, token=None, credentials=None):
        # Explicitly remove the business POST capability from the reused client.
        read.require(route in ("me", "recommendations", "applications", "fixture_detail",
                               "password_auth", "auth_identity", "session_logout_local"),
                     "REQUEST_NOT_ALLOWED")
        return super().request(route, token=token, credentials=credentials)


class Readback:
    def __init__(self):
        self.session = read.Acceptance(ReadbackClient())
        self.application_id = None
        self.baseline = None

    def get(self, resource):
        return read.mobile_response(self.session.request(resource, token=self.session.token), 200)

    def authenticate(self, email, password):
        user = self.session.authenticate(email, password)
        read.validate_resource("me", self.get("me"), user["id"], email)

    def empty_fixture(self):
        plan = self.get("recommendations")
        hosted.plan(plan)
        # No field evidence: shared Core marks extraction/resolution failed,
        # while programme/admissions verification stays pending. Do not call
        # this fixture verified or substitute a generic pending label.
        read.require(plan["items"][0]["decision"].get("evidenceState") == "failed", "CONSISTENCY")
        listing = read.shape(self.get("applications"), ("items",))
        read.require(listing["items"] == [], "BASELINE_CHANGED")

    def confirm(self):
        listing = read.shape(self.get("applications"), ("items",))
        read.require(isinstance(listing["items"], list) and len(listing["items"]) == 1, "CONSISTENCY")
        application_id = listing["items"][0].get("id") if isinstance(listing["items"][0], dict) else None
        read.require(read.is_uuid(application_id)
                     and self.application_id in (None, application_id), "CONSISTENCY")
        self.session.client.authorize_application(application_id)
        application = hosted.detail(self.get("fixture_detail"), application_id)
        hosted.plan(self.get("recommendations"), application_id)
        read.require(listing["items"] == [application], "CONSISTENCY")
        read.require(self.baseline is None or application == self.baseline, "CONSISTENCY")
        self.application_id, self.baseline = application_id, application


class Acceptance:
    def __init__(self):
        self.checks, self.phase, self.failure = set(), "context", None
        self.sha, self.apk_hash, self.android, self.readback = None, None, None, None
        self.write_state, self.add_attempts = "NOT_ATTEMPTED", 0
        self.failure_phase, self.driver_phase = None, None

    def step(self, name, callback):
        read.require(name in CHECKS, "CONSISTENCY")
        self.phase = name
        callback()
        self.checks.add(name)

    def guard(self):
        self.sha = read.context()
        read.require(os.environ.get("GITHUB_EVENT_NAME") in ("push", "workflow_dispatch"), "CONTEXT")
        self.checks.add("context")
        self.step("target", read.target)
        self.step("fixture_guard", hosted.fixture_guard)

    def release(self, apk):
        self.apk_hash = driver.verify_apk(apk)
        # Expo inlines these exact public settings into the release JS/Hermes
        # bundle. This supplements build-time config validation, not live proof.
        with zipfile.ZipFile(apk) as archive:
            bundle = archive.read("assets/index.android.bundle")
        driver.require(read.API.encode() in bundle and read.SUPABASE.encode() in bundle,
                       "RELEASE_PACKAGE_INVALID")
        self.android = driver.Android()
        self.android.prepare(apk)

    def school_plan(self):
        android = self.android
        android.tap("去选校")
        android.wait("我的选校方案")
        android.locate(hosted.LABEL)
        android.locate("你的留学档案已更新。现有方案尚未重新评估，请对照最新背景谨慎选择。")
        android.locate("本版本可查看已有方案，不会自动生成或重新搜索院校。")

    def programme_pending(self):
        android = self.android
        android.tap("查看项目")
        android.wait("项目详情")
        android.locate(hosted.LABEL)
        android.locate("信息核验：核验未完成")
        android.locate("学费：待核验")
        android.locate("截止日期：待核验")
        android.locate("加入后会建立申请档案，不代表已向学校提交申请。")
        android.locate("加入我的申请", actionable=True)

    def add_once(self):
        read.require(self.add_attempts == 0, "CONSISTENCY")
        # Recheck the exact singleton fixture immediately before the only tap.
        self.readback.empty_fixture()
        self.add_attempts += 1
        self.write_state = "UI_ADD_ATTEMPTED_UNCONFIRMED"
        self.android.tap("加入我的申请")
        self.android.wait("申请详情", timeout=75)
        self.android.wait("已加入我的申请")

    def application_detail(self):
        # The added message is outside RemoteContent. These assertions require
        # the actual successful detail response to have rendered instead.
        android = self.android
        android.wait("申请详情", timeout=75)
        android.locate("学校信息待确认")
        android.locate("项目名称待确认")
        android.locate("当前阶段：规划中")
        android.locate("申请下一步")
        android.locate("进度待确认")
        android.locate("查看材料与要求", actionable=True)

    def requirements(self):
        android = self.android
        android.tap("查看材料与要求")
        android.locate("材料准备情况")
        android.locate("0 / 4")
        android.locate("你可以在下方查看材料要求；App 内上传材料尚未开放。")
        android.locate("申请要求待确认，暂不能判断是否已满足。")

    def first_readback(self):
        self.readback.confirm()
        self.write_state = "UI_ADD_CONFIRMED"

    def existing_selection(self):
        android = self.android
        android.tap("返回我的申请")
        android.locate("学校信息待确认")
        android.locate("项目名称待确认")
        self.school_plan()
        android.locate("已加入我的申请")
        android.tap("查看项目")
        android.wait("项目详情")
        android.locate(hosted.LABEL)
        button = android.locate("查看申请", actionable=True)
        # Existing membership replaces Add with View in this same top panel.
        # Do not trigger a second write or use a hidden/deep-link shortcut.
        tree = android.tree()
        driver.require(android.find(tree, "加入我的申请", actionable=True) is None,
                       "UI_INPUT_MISMATCH")
        android.tap_node(button)
        self.application_detail()

    def cold_restart(self):
        android = self.android
        android.tap("返回我的申请")
        android.restart()
        android.wait("你的下一步", timeout=75)
        android.tap("申请", tab=True)
        android.locate("学校信息待确认")
        android.locate("项目名称待确认")
        android.tap("查看申请")
        self.application_detail()

    def run(self, email, password, apk):
        self.step("release_package", lambda: self.release(apk))
        self.step("android_login", lambda: self.android.login(email, password))
        self.step("account_identity", lambda: self.android.account(email))
        self.readback = Readback()
        self.step("read_session_identity", lambda: self.readback.authenticate(email, password))
        self.step("fixture_baseline", self.readback.empty_fixture)
        self.android.tap("申请", tab=True)
        self.android.wait("还没有申请项目", timeout=75)
        self.step("school_plan_zh", self.school_plan)
        self.step("programme_pending_zh", self.programme_pending)
        self.step("ui_add_once", self.add_once)
        self.step("application_detail_zh", self.application_detail)
        self.step("pending_requirements_zh", self.requirements)
        self.step("first_canonical_readback", self.first_readback)
        self.step("existing_selection_zh", self.existing_selection)
        self.step("revisit_same_application", self.readback.confirm)
        self.step("cold_restart_detail_zh", self.cold_restart)
        self.step("cold_restart_same_application", self.readback.confirm)
        self.android.tap("返回我的申请")
        self.step("final_sign_out", lambda: self.android.logout(email))

    def cleanup(self):
        if self.readback:
            self.readback.session.close()
            if self.readback.session.cleanup == "LOCAL_LOGOUT_CONFIRMED":
                self.checks.add("read_session_logout_local")
            else:
                self.record_failure(read.Failure("CONSISTENCY"), "read_session_logout_local")
        if self.android:
            try:
                self.android.remove_session()
                if self.android.installed:
                    self.checks.add("emulator_session_removed")
            except BaseException:
                self.record_failure(driver.Failure("EMULATOR_CLEANUP_FAILED"), "emulator_session_removed")

    def record_failure(self, error, phase=None):
        if self.failure is None:
            self.failure = error
            self.failure_phase = phase or self.phase
            self.driver_phase = self.android.phase if self.android else None

    def report(self, preflight=False):
        complete = all(name in self.checks for name in CHECKS)
        status = "PASS" if complete and not self.failure else "FAIL"
        if preflight and not self.failure:
            status = "PREFLIGHT_READY"
        result = {"status": status, "scope": "synthetic_pending_application_android_ui_with_read_only_corroboration",
                  "releaseReadiness": "NOT_READY", "fixtureCleanup": "REQUIRES_COORDINATOR",
                  "backendSourceSha": read.BACKEND_SHA, "targetUrl": read.API,
                  "writeState": self.write_state if self.write_state in WRITE_STATES else "NOT_ATTEMPTED",
                  "checks": [{"check": name, "status": "PASS" if name in self.checks else
                              "FAIL" if self.failure and self.failure_phase == name else "NOT_RUN"} for name in CHECKS]
                            + [{"check": name, "status": "NOT_RUN"} for name in NOT_RUN]}
        for key, value, pattern in (("sourceSha", self.sha, r"[0-9a-f]{40}"),
                                    ("apkSha256", self.apk_hash, r"[0-9a-f]{64}")):
            if isinstance(value, str) and re.fullmatch(pattern, value):
                result[key] = value
        if self.failure:
            allowed = read.FAILURES | driver.FAILURES
            code = getattr(self.failure, "code", "UNEXPECTED_FAILURE")
            result["failure"] = code if code in allowed else "UNEXPECTED_FAILURE"
            if self.failure_phase in CHECKS:
                result["phase"] = self.failure_phase
            if self.driver_phase in driver.PHASES:
                result["driverPhase"] = self.driver_phase
        return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preflight", action="store_true")
    parser.add_argument("--apk")
    args = parser.parse_args()
    acceptance = Acceptance()
    email, password = "", ""
    signal.signal(signal.SIGTERM, read.interrupted)
    signal.signal(signal.SIGINT, read.interrupted)
    signal.signal(signal.SIGALRM, read.interrupted)
    signal.alarm(900)
    try:
        acceptance.guard()
        acceptance.phase = "credentials_preflight"
        email, password = driver.credentials()
        acceptance.checks.add("credentials_preflight")
        if args.preflight:
            with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
                output.write("ready=true\n")
        else:
            driver.require(bool(args.apk), "RELEASE_PACKAGE_INVALID")
            acceptance.run(email, password, args.apk)
    except BaseException as error:
        acceptance.record_failure(error)
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.alarm(90)
        try:
            acceptance.cleanup()
        except BaseException as error:
            acceptance.record_failure(error)
        signal.alarm(0)
        email, password = "", ""
    result = acceptance.report(preflight=args.preflight)
    rendered = json.dumps(result, sort_keys=True)
    print(rendered, flush=True)
    try:
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as output:
                output.write("```json\n" + rendered + "\n```\n")
    except Exception:
        pass
    return 0 if result["status"] in ("PASS", "PREFLIGHT_READY") else 1


if __name__ == "__main__":
    sys.exit(main())
