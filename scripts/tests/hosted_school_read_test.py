"""Offline boundary tests; no SDK, credentials, sockets or hosted operations."""
import base64
import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError

SOURCE = Path(__file__).resolve().parents[1] / "hosted-school-read-e2e.py"
SPEC = importlib.util.spec_from_file_location("hosted_read", SOURCE)
read = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(read)
USER = "11111111-1111-4111-8111-111111111111"
EMAIL = "offline-test@example.invalid"
PASSWORD = "offline-only-private-value"
SHA = "a" * 40
HEADERS = {"content-type": "application/json", "cache-control": "private, no-store",
           "vary": "Authorization, Accept-Language", "content-language": "zh"}


def jwt(issuer=None):
    payload = {"iss": issuer or read.SUPABASE + "/auth/v1", "sub": USER,
               "role": "authenticated", "aud": "authenticated", "session_id": USER}
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    return "offline." + encoded + ".fixture"


def envelope(data):
    return {"data": data, "meta": {"schemaVersion": "1", "requestId": USER, "generatedAt": "2026-09-18T00:00:00Z"}}


def fixtures():
    return {
        "me": {"user": {"id": USER, "email": EMAIL, "displayName": None},
               "profile": {"status": "draft"}, "preferences": {"locale": "zh"},
               "privacy": {"aiMatchingAvailable": False}},
        "profile": {"values": {**{key: "" for key in read.PROFILE_TEXT}, "languages": [],
                               "acceptMajorChange": False, "acceptPathway": False},
                    "summary": {"confirmedCount": 1, "pendingCount": 0, "missingCount": 1,
                                "completeness": 50, "missingLabels": [], "nextPriority": "Next"},
                    "profileStatus": "draft", "pendingFacts": []},
        "recommendations": {"items": [], "generation": {"enabled": False, "profileStale": False, "runStatus": None}},
        "applications": {"items": []},
        "journey": {"currentStage": "school_plan", "completed": False, "currentTask": None,
                    "stages": [{"id": "school_plan", "state": "current"}], "tasks": [], "settling": None},
        "current-matters": {"currentStage": "school_plan", "completed": False, "primary": None, "matters": []},
    }


class FakeClient:
    def __init__(self):
        self.calls, self.data, self.fail, self.token = [], fixtures(), None, jwt()
        self.verified_id = USER

    def request(self, route, token=None, credentials=None):
        self.calls.append((route, token, credentials))
        if route == self.fail:
            raise read.Failure("NETWORK")
        if route in read.RESOURCES:
            if token in (None, "invalid-token"):
                return 401, HEADERS, {"error": {"code": "UNAUTHENTICATED", "message": PASSWORD}, "meta": {"schemaVersion": "1"}}
            return 200, HEADERS, envelope(copy.deepcopy(self.data[route]))
        if route == "password_auth":
            return 200, HEADERS, {"access_token": self.token, "refresh_token": PASSWORD,
                                  "user": {"id": USER, "email": EMAIL}}
        if route == "auth_identity":
            return 200, HEADERS, {"id": self.verified_id, "email": EMAIL}
        if route == "session_logout_local":
            return 204, HEADERS, None
        raise AssertionError("Unexpected fake route")


def exercise(client):
    acceptance = read.Acceptance(client)
    acceptance.sha = SHA
    acceptance.checks.update({"context": "PASS", "target": "PASS"})
    try:
        acceptance.run(EMAIL, PASSWORD)
    except read.Failure as error:
        acceptance.failure = error.code
        acceptance.checks[acceptance.phase] = "FAIL"
    finally:
        acceptance.close()
    return acceptance


class FlowTests(unittest.TestCase):
    def test_success_reads_only_and_logout_is_last_without_leaking_account(self):
        client = FakeClient()
        acceptance = exercise(client)
        report = acceptance.report()
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(report["cleanup"], "LOCAL_LOGOUT_CONFIRMED")
        self.assertEqual(client.calls[-1][0], "session_logout_local")
        self.assertEqual([r for r, _, _ in client.calls if r not in read.RESOURCES],
                         ["password_auth", "auth_identity", "session_logout_local"])
        self.assertIsNone(acceptance.token)
        self.assertTrue(all(row["status"] == "NOT_RUN" for row in report["checks"] if row["check"] in read.NOT_RUN))
        for private in (EMAIL, PASSWORD, USER, jwt()):
            self.assertNotIn(private, json.dumps(report))

    def test_read_failure_still_revokes_only_the_created_session(self):
        client = FakeClient()
        client.data["profile"]["summary"]["completeness"] = 101
        result = exercise(client).report()
        self.assertEqual(result["failure"], "SHAPE")
        self.assertEqual(result["phase"], "read_profile")
        self.assertEqual(result["cleanup"], "LOCAL_LOGOUT_CONFIRMED")
        self.assertEqual(client.calls[-1][0], "session_logout_local")

    def test_logout_failure_cannot_pass_and_does_not_retain_token(self):
        client = FakeClient()
        client.fail = "session_logout_local"
        acceptance = exercise(client)
        self.assertEqual(acceptance.report()["status"], "FAIL")
        self.assertEqual(acceptance.cleanup, "UNCONFIRMED")
        self.assertIsNone(acceptance.token)

    def test_login_transport_unknown_does_not_claim_no_session(self):
        client = FakeClient()
        client.fail = "password_auth"
        acceptance = exercise(client)
        self.assertEqual(acceptance.cleanup, "UNCONFIRMED")
        self.assertNotIn("auth_identity", [r for r, _, _ in client.calls])

    def test_wrong_project_token_is_not_forwarded_to_backend(self):
        client = FakeClient()
        client.token = jwt("https://wrong-project.invalid/auth/v1")
        result = exercise(client).report()
        self.assertEqual(result["failure"], "TOKEN_TARGET")
        self.assertFalse(any(r in read.RESOURCES and token == client.token for r, token, _ in client.calls))
        self.assertEqual(result["cleanup"], "LOCAL_LOGOUT_CONFIRMED")

    def test_verified_identity_mismatch_blocks_all_authenticated_reads(self):
        client = FakeClient()
        client.verified_id = "22222222-2222-4222-8222-222222222222"
        result = exercise(client).report()
        self.assertEqual(result["failure"], "IDENTITY")
        self.assertFalse(any(r in read.RESOURCES and token == client.token for r, token, _ in client.calls))

    def test_nonempty_baseline_never_counts_as_write_acceptance(self):
        for resource in ("recommendations", "applications"):
            with self.subTest(resource=resource):
                client = FakeClient()
                client.data[resource]["items"] = [{"id": USER}]
                result = exercise(client).report()
                self.assertEqual(result["failure"], "BASELINE_CHANGED")
                self.assertEqual(result["cleanup"], "LOCAL_LOGOUT_CONFIRMED")

    def test_disabled_ai_and_journey_consistency_are_verified(self):
        client = FakeClient()
        client.data["recommendations"]["generation"]["enabled"] = True
        self.assertEqual(exercise(client).report()["failure"], "AI_ENABLED")
        client = FakeClient()
        client.data["journey"]["currentStage"] = "visa"
        self.assertEqual(exercise(client).report()["failure"], "CONSISTENCY")

    def test_envelope_cache_locale_and_real_401_are_required(self):
        cases = [
            (200, HEADERS, {"data": {}, "meta": {"schemaVersion": "2"}}),
            (200, {**HEADERS, "cache-control": "public"}, envelope({})),
            (200, {**HEADERS, "content-language": "en"}, envelope({})),
            (401, HEADERS, {"data": {"private": PASSWORD}, "error": {"code": "UNAUTHENTICATED"}, "meta": {"schemaVersion": "1"}}),
            (403, HEADERS, {"error": {"code": "UNAUTHENTICATED"}, "meta": {"schemaVersion": "1"}}),
        ]
        for response in cases:
            with self.subTest(status=response[0]), self.assertRaises(read.Failure):
                read.mobile_response(response, 401 if response[0] in (401, 403) else 200)


class TransportTests(unittest.TestCase):
    def client(self, response=None, error=None):
        client = read.Client()
        client.opener = Mock()
        client.opener.open.return_value = response
        client.opener.open.side_effect = error
        return client

    def test_unknown_routes_and_body_override_never_reach_network(self):
        client = self.client()
        for route, kwargs in (("https://untrusted.invalid", {}), ("applications/" + USER, {}),
                              ("applications", {"credentials": {"email": EMAIL, "password": PASSWORD}}),
                              ("me", {"token": "bad\r\nCookie: private"})):
            with self.subTest(route=route), self.assertRaises(read.Failure):
                client.request(route, **kwargs)
        client.opener.open.assert_not_called()

    def test_direct_redirect_and_httperror_redirect_are_never_followed_or_read(self):
        with self.assertRaises(read.Failure) as result:
            read.NoRedirect().redirect_request(None, None, 307, PASSWORD, {}, "https://untrusted.invalid")
        self.assertEqual(result.exception.code, "REDIRECT")
        response = HTTPError(read.API + "/api/mobile/v1/me", 307, PASSWORD,
                             {"Location": "https://untrusted.invalid"}, io.BytesIO(PASSWORD.encode()))
        with patch.object(response, "read") as body, patch.object(response, "close") as close:
            client = self.client(error=response)
            with self.assertRaises(read.Failure) as result:
                client.request("me", token=jwt())
            self.assertEqual(result.exception.code, "REDIRECT")
            body.assert_not_called()
            close.assert_called_once()
            self.assertEqual(client.opener.open.call_count, 1)

    def test_changed_response_origin_is_rejected_before_body(self):
        response = Mock(code=200)
        response.geturl.return_value = "https://untrusted.invalid"
        with self.assertRaises(read.Failure) as result:
            self.client(response=response).request("me", token=jwt())
        self.assertEqual(result.exception.code, "REDIRECT")
        response.read.assert_not_called()

    def test_exact_local_logout_and_no_cookie_or_credential_body(self):
        response = Mock(code=204, headers={})
        response.geturl.return_value = read.SUPABASE + "/auth/v1/logout?scope=local"
        response.read.return_value = b""
        client = self.client(response=response)
        self.assertEqual(client.request("session_logout_local", token=jwt())[0], 204)
        request = client.opener.open.call_args.args[0]
        self.assertEqual(request.full_url, read.SUPABASE + "/auth/v1/logout?scope=local")
        self.assertEqual(request.get_method(), "POST")
        self.assertIsNone(request.data)
        self.assertNotIn("Cookie", request.headers)

    def test_network_json_and_oversize_errors_are_sanitized(self):
        client = self.client(error=RuntimeError(PASSWORD))
        with self.assertRaises(read.Failure) as result:
            client.request("me", token=jwt())
        self.assertEqual(str(result.exception), "NETWORK")
        for body in (PASSWORD.encode(), b"x" * 1_048_577):
            response = Mock(code=200, headers=HEADERS)
            response.geturl.return_value = read.API + "/api/mobile/v1/me"
            response.read.return_value = body
            with self.assertRaises(read.Failure) as result:
                self.client(response=response).request("me", token=jwt())
            self.assertEqual(str(result.exception), "JSON")


class ContextTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.event = Path(temporary.name) / "event.json"
        self.event.write_text(json.dumps({"repository": {"visibility": "public", "full_name": read.REPOSITORY}}))
        environment = {"GITHUB_ACTIONS": "true", "GITHUB_REPOSITORY": read.REPOSITORY,
                       "GITHUB_REF": read.BRANCH, "GITHUB_EVENT_NAME": "push", "GITHUB_SHA": SHA,
                       "GITHUB_EVENT_PATH": str(self.event), "ATLAS_PREVIEW_TEST_EMAIL": EMAIL,
                       "ATLAS_PREVIEW_TEST_PASSWORD": PASSWORD, "EXPO_PUBLIC_APP_ENV": "preview",
                       "EXPO_PUBLIC_ATLAS_API_URL": read.API, "EXPO_PUBLIC_SUPABASE_URL": read.SUPABASE,
                       "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": read.PUBLIC_KEY}
        self.enterContext(patch.dict(read.os.environ, environment, clear=True))
        self.enterContext(patch.object(read.sys, "platform", "linux"))
        self.git = self.enterContext(patch.object(read.subprocess, "run", return_value=
                                                subprocess.CompletedProcess([], 0, (SHA + "\n").encode(), b"")))

    def test_public_exact_branch_and_immutable_target_pass_without_child_credentials(self):
        self.assertEqual(read.context(), SHA)
        read.target()
        child = self.git.call_args.kwargs["env"]
        self.assertNotIn("ATLAS_PREVIEW_TEST_EMAIL", child)
        self.assertNotIn("ATLAS_PREVIEW_TEST_PASSWORD", child)

    def test_wrong_ref_pr_debug_or_repo_never_passes(self):
        for key, value in (("GITHUB_REF", "refs/heads/main"), ("GITHUB_EVENT_NAME", "pull_request"),
                           ("GITHUB_REPOSITORY", "other/repo"), ("RUNNER_DEBUG", "1"), ("ACTIONS_STEP_DEBUG", "true")):
            with self.subTest(key=key), patch.dict(read.os.environ, {key: value}), self.assertRaises(read.Failure):
                read.context()
        self.event.write_text(json.dumps({"repository": {"visibility": "private", "full_name": read.REPOSITORY}}))
        with self.assertRaises(read.Failure):
            read.context()

    def test_branch_alias_wrong_project_or_secret_key_configuration_is_refused(self):
        for key, value in (("EXPO_PUBLIC_ATLAS_API_URL", "https://branch-alias.invalid"),
                           ("EXPO_PUBLIC_SUPABASE_URL", "https://other-project.invalid"),
                           ("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "not-the-fixed-public-key"),
                           ("EXPO_PUBLIC_APP_ENV", "production")):
            with self.subTest(key=key), patch.dict(read.os.environ, {key: value}), self.assertRaises(read.Failure):
                read.target()


if __name__ == "__main__":
    unittest.main()
