#!/usr/bin/env python3
"""One explicitly seeded synthetic pending discovery, fixed Student Preview.

No catalogue seeding, database credentials, AI, browser, APK or file upload.
Only two identical business POSTs are allowed. A failed POST is never retried.
The coordinator separately verifies database rows and removes the fixture.
"""
import importlib.util
import json
import os
from pathlib import Path
import re
import signal
import sys
from urllib.error import HTTPError
from urllib.request import Request

spec = importlib.util.spec_from_file_location(
    "atlas_hosted_school_read", Path(__file__).with_name("hosted-school-read-e2e.py"))
read = importlib.util.module_from_spec(spec)
spec.loader.exec_module(read)

MARKER = "atlas-native-pending-20260918-v1"
RUN_ID = "24a7784d-f32e-49e9-b89b-0d74d2bf55ad"
DISCOVERY_ID = "74f728e4-dfb9-4122-9aa6-d70cf836f1a6"
LABEL = "ATLAS TEST ONLY " + MARKER
FIXTURE_URL = "https://atlas-native-e2e.invalid/" + MARKER + "/programme"
MATERIAL_TYPES = {"degree_certificate", "academic_transcript", "language_score", "standardized_test_score"}
CHECKS = ("context", "target", "fixture_guard", "password_auth", "auth_identity", "account_boundary",
          "fixture_plan", "empty_applications", "first_add", "first_detail", "first_list",
          "first_membership", "duplicate_add", "duplicate_detail", "duplicate_list",
          "duplicate_membership", "session_logout_local")
NOT_RUN = ("database_row_assertions", "database_fixture_cleanup", "positive_material_initialization",
           "hosted_partial_initialization", "cross_user_isolation", "real_school_recommendation",
           "native_ui", "physical_arm_device", "full_business_journey")
WRITE_STATES = ("NOT_ATTEMPTED", "FIRST_ATTEMPTED_UNCONFIRMED", "FIRST_CONFIRMED",
                "DUPLICATE_ATTEMPTED_UNCONFIRMED", "DUPLICATE_CONFIRMED")


def fixture_guard():
    expected = {"ATLAS_E2E_FIXTURE_ENABLED": "true", "ATLAS_E2E_FIXTURE_MARKER": MARKER,
                "ATLAS_E2E_FIXTURE_RUN_ID": RUN_ID, "ATLAS_E2E_FIXTURE_DISCOVERY_ID": DISCOVERY_ID,
                "ATLAS_E2E_FIXTURE_KIND": "discovery", "ATLAS_E2E_FIXTURE_STATUS": "current"}
    read.require(all(os.environ.get(key) == value for key, value in expected.items()), "TARGET")
    # The raw discovery status is verified by the coordinator's DB preflight;
    # the public DTO exposes selectable, not the raw status or fixture payload.
    read.require(read.API == "https://atlas-os-preview-efevbscqm-libing-hongs-projects.vercel.app"
                 and read.SUPABASE == "https://efvpndayardwjqtwtdmx.supabase.co"
                 and read.REPOSITORY == "libing-hong/Atlas-Mobile"
                 and read.BRANCH == "refs/heads/feature/native-school-applications-v1"
                 and read.BACKEND_SHA == "d7dcbb6b1ec1bea9d1f293d9fcc011c41bee1914"
                 and read.DEPLOYMENT == "dpl_CRiG7zKcshuCL24GF7NAt8BoEZGR", "TARGET")


class Client(read.Client):
    def __init__(self):
        super().__init__()
        self.application_id, self.posts = None, 0

    def authorize_application(self, value):
        read.require(read.is_uuid(value) and self.application_id in (None, value), "IDENTITY")
        self.application_id = value

    def request(self, route, token=None, credentials=None):
        if route not in ("fixture_add", "fixture_detail"):
            return super().request(route, token=token, credentials=credentials)
        fixture_guard()
        read.require(credentials is None and isinstance(token, str)
                     and re.fullmatch(r"[A-Za-z0-9_.-]{1,16384}", token) is not None,
                     "REQUEST_NOT_ALLOWED")
        headers = {"Accept": "application/json", "Accept-Language": "zh-CN", "Authorization": "Bearer " + token}
        url, body, method = read.API + "/api/mobile/v1/applications", None, "GET"
        if route == "fixture_add":
            read.require(self.posts < 2 and (self.posts == 0 or self.application_id is not None), "REQUEST_NOT_ALLOWED")
            self.posts += 1  # Count attempts, including unknown outcomes; never retry.
            method = "POST"
            headers["Content-Type"] = "application/json"
            body = json.dumps({"selection": {"kind": "discovery", "id": DISCOVERY_ID}}).encode()
        else:
            read.require(read.is_uuid(self.application_id), "REQUEST_NOT_ALLOWED")
            url += "/" + self.application_id
        response = None
        try:
            try:
                response = self.opener.open(Request(url, data=body, headers=headers, method=method), timeout=10)
            except HTTPError as error:
                response = error
            read.require(not 300 <= response.code < 400 and response.geturl() == url, "REDIRECT")
            raw = response.read(1_048_577)
            read.require(len(raw) <= 1_048_576, "JSON")
            values = {key.lower(): value for key, value in response.headers.items()}
            read.require(values.get("content-type", "").split(";", 1)[0].strip().lower() == "application/json", "JSON")
            try:
                data = json.loads(raw)
            except Exception:
                raise read.Failure("JSON") from None
            return response.code, values, data
        except read.Failure:
            raise
        except Exception:
            raise read.Failure("NETWORK") from None
        finally:
            if response is not None:
                response.close()


def plan(data, application_id=None):
    read.shape(data, ("items", "generation"))
    read.require(isinstance(data["items"], list) and len(data["items"]) == 1, "BASELINE_CHANGED")
    item = read.shape(data["items"][0], ("selection", "selectable", "programId", "schoolName", "programName",
                                       "countryCode", "degreeLevel", "officialUrl", "applicationId", "decision"))
    read.require(item["selection"] == {"kind": "discovery", "id": DISCOVERY_ID}
                 and item["selectable"] is True and item["schoolName"] == LABEL and item["programName"] == LABEL
                 and item["countryCode"] == "FR" and item["degreeLevel"] is None and item["officialUrl"] == FIXTURE_URL
                 and item["applicationId"] == application_id, "BASELINE_CHANGED")
    read.require(item["programId"] is None if application_id is None else read.is_uuid(item["programId"]), "CONSISTENCY")
    generation = read.shape(data["generation"], ("enabled", "profileStale", "runStatus"))
    read.require(generation["enabled"] is False, "AI_ENABLED")
    read.require(generation["profileStale"] is True and generation["runStatus"] == "completed", "BASELINE_CHANGED")
    decision = item["decision"]
    read.require(isinstance(decision, dict) and decision.get("recommendationUsable") is False
                 and isinstance(decision.get("verification"), dict)
                 and decision["verification"].get("programme") != "verified"
                 and decision["verification"].get("admissions") != "verified", "CONSISTENCY")


def selection_result(data, created, application_id=None):
    read.shape(data, ("applicationId", "created", "initialization"))
    read.require(read.is_uuid(data["applicationId"]) and data["created"] is created
                 and (application_id is None or data["applicationId"] == application_id), "CONSISTENCY")
    read.require(data["initialization"] == {"materials": "completed", "requirements": "completed"}, "CONSISTENCY")
    return data["applicationId"]


def pending_application(value, application_id):
    read.shape(value, ("id", "schoolName", "programName", "countryCode", "degreeLevel", "status", "submissionMode",
                       "selectedForVisa", "materialsReady", "materialsTotal", "materials", "catalogueVerification",
                       "requirements", "decision", "submittedAt", "decisionAt", "updatedAt", "action"))
    read.require(value["id"] == application_id and value["status"] == "planning"
                 and value["submissionMode"] is None and value["selectedForVisa"] is False
                 and value["submittedAt"] is None and value["decisionAt"] is None, "CONSISTENCY")
    read.require(value["materialsReady"] == 0 and value["materialsTotal"] == 4
                 and isinstance(value["materials"], list) and len(value["materials"]) == 4
                 and value["requirements"] == [], "CONSISTENCY")
    for material in value["materials"]:
        read.shape(material, ("materialType", "status"))
        read.require(material["status"] == "missing", "CONSISTENCY")
    read.require({row["materialType"] for row in value["materials"]} == MATERIAL_TYPES, "CONSISTENCY")
    read.require(value["catalogueVerification"] == {"identity": None, "legacyProgramme": None, "legacySchool": None, "admissions": None}, "CONSISTENCY")
    decision = value["decision"]
    read.require(isinstance(decision, dict) and decision.get("recommendationUsable") is False
                 and decision.get("programmeVerification") != "verified"
                 and decision.get("admissionsVerification") != "verified", "CONSISTENCY")
    read.require(value["action"] == {"enabled": True, "kind": "OPEN_APPLICATION", "resourceId": application_id}, "CONSISTENCY")
    return value


def detail(data, application_id):
    read.shape(data, ("application", "decision", "nextStep"))
    application = pending_application(data["application"], application_id)
    read.require(isinstance(data["decision"], dict) and data["decision"].get("recommendationUsable") is False, "CONSISTENCY")
    next_step = data["nextStep"]
    read.require(isinstance(next_step, dict), "CONSISTENCY")
    read.shape(next_step, ("matter", "label", "displayStatus", "progress", "progressIndeterminate"))
    read.matter(next_step["matter"])
    read.require(next_step["matter"]["id"] == application_id and next_step["matter"]["stage"] == "applications"
                 and next_step["matter"]["status"] == "blocked" and next_step["progress"] is None
                 and next_step["progressIndeterminate"] is True, "CONSISTENCY")
    return application


class Acceptance(read.Acceptance):
    def __init__(self, client):
        super().__init__(client)
        self.write_state = "NOT_ATTEMPTED"

    def run(self, email, password):
        read.require(isinstance(email, str) and email == email.strip() and 0 < len(email) <= 254
                     and isinstance(password, str) and 0 < len(password) <= 256, "CREDENTIALS")
        user = self.authenticate(email, password)
        self.phase = "account_boundary"
        read.validate_resource("me", read.mobile_response(self.request("me", token=self.token), 200), user["id"], email)
        self.passed()
        self.phase = "fixture_plan"
        plan(read.mobile_response(self.request("recommendations", token=self.token), 200))
        self.passed()
        self.phase = "empty_applications"
        before = read.mobile_response(self.request("applications", token=self.token), 200)
        read.shape(before, ("items",))
        read.require(before["items"] == [], "BASELINE_CHANGED")
        self.passed()
        baseline = None
        application_id = None
        for attempt in ("first", "duplicate"):
            self.phase = attempt + "_add"
            self.write_state = "FIRST_ATTEMPTED_UNCONFIRMED" if attempt == "first" else "DUPLICATE_ATTEMPTED_UNCONFIRMED"
            result = read.mobile_response(self.request("fixture_add", token=self.token), 200)
            application_id = selection_result(result, attempt == "first", application_id)
            self.client.authorize_application(application_id)
            self.write_state = "FIRST_CONFIRMED" if attempt == "first" else "DUPLICATE_CONFIRMED"
            self.passed()
            self.phase = attempt + "_detail"
            application = detail(read.mobile_response(self.request("fixture_detail", token=self.token), 200), application_id)
            if baseline is None:
                baseline = application
            else:
                read.require(application == baseline, "CONSISTENCY")
            self.passed()
            self.phase = attempt + "_list"
            listing = read.mobile_response(self.request("applications", token=self.token), 200)
            read.shape(listing, ("items",))
            read.require(listing["items"] == [baseline], "CONSISTENCY")
            self.passed()
            self.phase = attempt + "_membership"
            plan(read.mobile_response(self.request("recommendations", token=self.token), 200), application_id)
            self.passed()

    def report(self):
        complete = all(self.checks.get(check) == "PASS" for check in CHECKS)
        result = {"status": "PASS" if complete and not self.failure else "FAIL",
                  "scope": "synthetic_pending_application_http_persistence",
                  "backendSourceSha": read.BACKEND_SHA, "targetUrl": read.API,
                  "releaseReadiness": "NOT_READY", "fixtureCleanup": "REQUIRES_COORDINATOR",
                  "writeState": self.write_state if self.write_state in WRITE_STATES else "NOT_ATTEMPTED",
                  "sessionCleanup": self.cleanup if self.cleanup in ("NOT_NEEDED", "UNCONFIRMED", "LOCAL_LOGOUT_CONFIRMED") else "UNCONFIRMED",
                  "checks": [{"check": name, "status": self.checks.get(name) if self.checks.get(name) in ("PASS", "FAIL") else "NOT_RUN"} for name in CHECKS]
                            + [{"check": name, "status": "NOT_RUN"} for name in NOT_RUN]}
        if isinstance(self.sha, str) and re.fullmatch(r"[0-9a-f]{40}", self.sha):
            result["sourceSha"] = self.sha
        if self.failure:
            result["failure"] = self.failure if self.failure in read.FAILURES else "UNEXPECTED"
            result["phase"] = self.phase if self.phase in CHECKS else "context"
            if type(self.last_status) is int and 100 <= self.last_status <= 599:
                result["httpStatus"] = self.last_status
        return result


def main():
    acceptance = Acceptance(Client())
    signal.signal(signal.SIGTERM, read.interrupted)
    signal.signal(signal.SIGINT, read.interrupted)
    signal.signal(signal.SIGALRM, read.interrupted)
    signal.alarm(180)
    try:
        acceptance.sha = read.context()
        acceptance.passed()
        acceptance.phase = "target"
        read.target()
        acceptance.passed()
        acceptance.phase = "fixture_guard"
        fixture_guard()
        acceptance.passed()
        acceptance.run(*(os.environ.get(name, "") for name in read.SECRET_NAMES))
    except BaseException as error:
        acceptance.failure = error.code if isinstance(error, read.Failure) else "UNEXPECTED"
        acceptance.checks[acceptance.phase] = "FAIL"
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.alarm(15)
        acceptance.close()
        signal.alarm(0)
    report = acceptance.report()
    rendered = json.dumps(report, sort_keys=True)
    print(rendered, flush=True)
    try:
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as output:
                output.write("```json\n" + rendered + "\n```\n")
    except Exception:
        pass
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
