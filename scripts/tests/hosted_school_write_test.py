"""Offline fixtures only: no account, secrets, network or database operations."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("write_acceptance", Path(__file__).parents[1] / "hosted-school-write-e2e.py")
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)
APP = "d97e4d22-bf9e-4191-9619-59f00f318ca3"
USER = "fae4aa9c-d443-4913-8e38-6f43ab3ca9a0"
PROGRAM = "f178bf57-359b-47ed-9a67-7b5ea3c9aacf"
ENV = {"ATLAS_E2E_FIXTURE_ENABLED": "true", "ATLAS_E2E_FIXTURE_MARKER": script.MARKER,
       "ATLAS_E2E_FIXTURE_RUN_ID": script.RUN_ID, "ATLAS_E2E_FIXTURE_DISCOVERY_ID": script.DISCOVERY_ID,
       "ATLAS_E2E_FIXTURE_KIND": "discovery", "ATLAS_E2E_FIXTURE_STATUS": "current"}


def response(data):
    return 200, {"cache-control": "private, no-store", "vary": "Authorization, Accept-Language", "content-language": "zh"}, {
        "data": copy.deepcopy(data), "meta": {"requestId": APP, "generatedAt": "2026-09-18T00:00:00Z", "schemaVersion": "1"}}


def application():
    return {"id": APP, "schoolName": "学校信息待确认", "programName": "项目名称待确认", "countryCode": "—",
            "degreeLevel": None, "status": "planning", "submissionMode": None, "selectedForVisa": False,
            "materialsReady": 0, "materialsTotal": 4,
            "materials": [{"materialType": name, "status": "missing"} for name in sorted(script.MATERIAL_TYPES)],
            "catalogueVerification": {"identity": None, "legacyProgramme": None, "legacySchool": None, "admissions": None},
            "requirements": [], "decision": {"recommendationUsable": False, "programmeVerification": "pending", "admissionsVerification": "pending"},
            "submittedAt": None, "decisionAt": None, "updatedAt": "2026-09-18T00:00:00Z",
            "action": {"enabled": True, "kind": "OPEN_APPLICATION", "resourceId": APP}}


class FakeClient:
    def __init__(self, failure=None):
        self.failure, self.posts, self.logouts = failure, 0, 0
        self.application_id = None

    def authorize_application(self, value):
        self.application_id = value

    def request(self, route, token=None, credentials=None):
        if route == "session_logout_local":
            self.logouts += 1
            return 204, {}, None
        if route == "me":
            return response({"user": {"id": USER, "email": "offline@example.invalid", "displayName": None},
                             "profile": {"status": "ready"}, "preferences": {"locale": "zh"}, "privacy": {"aiMatchingAvailable": False}})
        if route == "recommendations":
            return response({"items": [{"selection": {"kind": "discovery", "id": script.DISCOVERY_ID},
                             "selectable": True, "programId": PROGRAM if self.posts else None,
                             "schoolName": script.LABEL, "programName": script.LABEL, "countryCode": "FR", "degreeLevel": None,
                             "officialUrl": script.FIXTURE_URL, "applicationId": APP if self.posts else None,
                             "decision": {"recommendationUsable": False, "verification": {"programme": "pending", "admissions": "pending"}}}],
                             "generation": {"enabled": False, "profileStale": True, "runStatus": "completed"}})
        if route == "fixture_add":
            self.posts += 1
            if self.failure == "network":
                raise script.read.Failure("NETWORK")
            return response({"applicationId": APP, "created": self.posts == 1 and self.failure != "preexisting",
                             "initialization": {"materials": "completed", "requirements": "completed"}})
        item = application()
        if self.failure == "changed" and self.posts == 2:
            item["updatedAt"] = "2026-09-18T00:01:00Z"
        if route == "applications":
            return response({"items": [item] if self.posts else []})
        if route == "fixture_detail":
            return response({"application": item, "decision": {"recommendationUsable": False},
                             "nextStep": {"matter": {"id": APP, "stage": "applications", "title": "pending", "description": "pending",
                                           "status": "blocked", "dueAt": None, "dependencyTaskIds": [],
                                           "action": {"enabled": True, "kind": "OPEN_APPLICATION", "resourceId": APP}},
                                          "label": "pending", "displayStatus": "pending", "progress": None, "progressIndeterminate": True}})
        raise AssertionError("Unexpected offline route")


class OfflineAcceptance(script.Acceptance):
    def authenticate(self, email, password):
        # Password/getUser/session boundaries are independently tested by the
        # unchanged read acceptance suite. This fixture isolates write logic.
        self.token = "offline.access.token"
        self.auth_attempted = True
        self.checks.update({"password_auth": "PASS", "auth_identity": "PASS"})
        return {"id": USER, "email": email}


class WriteAcceptanceTests(unittest.TestCase):
    def test_exact_fixture_guard_rejects_every_changed_value(self):
        with patch.dict(os.environ, ENV, clear=True):
            script.fixture_guard()
        for key in ENV:
            with self.subTest(key=key), patch.dict(os.environ, {**ENV, key: "wrong"}, clear=True):
                with self.assertRaises(script.read.Failure):
                    script.fixture_guard()

    def test_fixed_post_body_limit_and_authorized_detail(self):
        calls = []
        class Reply:
            code = 200
            headers = {"Content-Type": "application/json"}
            def __init__(self, url): self.url = url
            def geturl(self): return self.url
            def read(self, _limit): return b"{}"
            def close(self): pass
        class Opener:
            def open(self, req, timeout):
                calls.append(req)
                return Reply(req.full_url)
        client = script.Client()
        client.opener = Opener()
        with patch.dict(os.environ, ENV, clear=True):
            with self.assertRaises(script.read.Failure): client.request("fixture_detail", token="offline")
            with self.assertRaises(script.read.Failure): client.request("fixture_add")
            client.request("fixture_add", token="offline")
            with self.assertRaises(script.read.Failure): client.request("fixture_add", token="offline")
            client.authorize_application(APP)
            client.request("fixture_detail", token="offline")
            client.request("fixture_add", token="offline")
            with self.assertRaises(script.read.Failure): client.request("fixture_add", token="offline")
        self.assertEqual(len(calls), 3)
        for req in (calls[0], calls[2]):
            self.assertEqual(req.full_url, script.read.API + "/api/mobile/v1/applications")
            self.assertEqual(json.loads(req.data), {"selection": {"kind": "discovery", "id": script.DISCOVERY_ID}})
        self.assertEqual(calls[1].full_url, script.read.API + "/api/mobile/v1/applications/" + APP)

    def test_redirect_is_rejected_before_body_and_closed(self):
        class Reply:
            code = 302
            reads = 0
            closed = False
            def geturl(self): return script.read.API + "/api/mobile/v1/applications"
            def read(self, _limit): self.reads += 1; return b"PRIVATE"
            def close(self): self.closed = True
        reply = Reply()
        class Opener:
            def open(self, req, timeout): return reply
        client = script.Client(); client.opener = Opener()
        with patch.dict(os.environ, ENV, clear=True), self.assertRaises(script.read.Failure):
            client.request("fixture_add", token="offline")
        self.assertEqual(reply.reads, 0)
        self.assertTrue(reply.closed)

    def test_first_duplicate_detail_and_membership_checks(self):
        client = FakeClient(); acceptance = OfflineAcceptance(client)
        acceptance.checks.update({name: "PASS" for name in ("context", "target", "fixture_guard")})
        acceptance.run("offline@example.invalid", "offline-test")
        acceptance.close()
        self.assertEqual(client.posts, 2)
        self.assertEqual(client.logouts, 1)
        self.assertEqual(acceptance.report()["status"], "PASS")
        rendered = json.dumps(acceptance.report())
        for private in (APP, USER, PROGRAM, script.DISCOVERY_ID, script.RUN_ID, "offline@example.invalid", "offline.access.token"):
            self.assertNotIn(private, rendered)

    def test_preexisting_first_result_cannot_pass_or_duplicate(self):
        client = FakeClient("preexisting"); acceptance = OfflineAcceptance(client)
        with self.assertRaises(script.read.Failure): acceptance.run("offline@example.invalid", "offline-test")
        acceptance.close()
        self.assertEqual(client.posts, 1)
        self.assertEqual(client.logouts, 1)
        self.assertEqual(acceptance.write_state, "FIRST_ATTEMPTED_UNCONFIRMED")

    def test_unknown_outcome_is_not_retried_and_session_is_local(self):
        client = FakeClient("network"); acceptance = OfflineAcceptance(client)
        with self.assertRaises(script.read.Failure): acceptance.run("offline@example.invalid", "offline-test")
        acceptance.close()
        self.assertEqual(client.posts, 1)
        self.assertEqual(client.logouts, 1)
        self.assertEqual(acceptance.write_state, "FIRST_ATTEMPTED_UNCONFIRMED")
        self.assertIsNone(acceptance.token)

    def test_duplicate_canonical_mutation_fails(self):
        client = FakeClient("changed"); acceptance = OfflineAcceptance(client)
        with self.assertRaises(script.read.Failure): acceptance.run("offline@example.invalid", "offline-test")
        acceptance.close()
        self.assertEqual(acceptance.phase, "duplicate_detail")
        self.assertEqual(client.posts, 2)
        self.assertEqual(client.logouts, 1)

    def test_virtual_missing_slots_are_not_ready_materials(self):
        item = application()
        script.pending_application(item, APP)
        for patch_value in ({"materialsTotal": 0}, {"materialsReady": 4}, {"status": "ready_to_submit"}):
            with self.subTest(patch=patch_value), self.assertRaises(script.read.Failure):
                script.pending_application({**item, **patch_value}, APP)


if __name__ == "__main__":
    unittest.main()
