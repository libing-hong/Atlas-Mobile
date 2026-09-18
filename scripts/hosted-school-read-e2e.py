#!/usr/bin/env python3
"""Fixed Preview deployment, designated-account reads only. No SDK or business writes.

Only password sign-in and scope=local sign-out use POST. Credentials, tokens,
identity and response bodies stay in memory. The empty baseline is intentional;
this is not application-creation, cross-user, Android or service-key validation.
Supabase sign-out semantics: https://supabase.com/docs/reference/javascript/auth-signout
Access JWTs can remain valid until expiry after local refresh-session revocation.
"""
import base64
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

REPOSITORY = "libing-hong/Atlas-Mobile"
BRANCH = "refs/heads/feature/native-school-applications-v1"
API = "https://atlas-os-preview-efevbscqm-libing-hongs-projects.vercel.app"
SUPABASE = "https://efvpndayardwjqtwtdmx.supabase.co"
PUBLIC_KEY = "sb_publishable_P0c1JB0dFOICwntFalOxOw_wetxrArJ"
BACKEND_SHA = "d7dcbb6b1ec1bea9d1f293d9fcc011c41bee1914"
DEPLOYMENT = "dpl_CRiG7zKcshuCL24GF7NAt8BoEZGR"
SECRET_NAMES = ("ATLAS_PREVIEW_TEST_EMAIL", "ATLAS_PREVIEW_TEST_PASSWORD")
RESOURCES = ("me", "profile", "recommendations", "applications", "journey", "current-matters")
CHECKS = ("context", "target",) + tuple(
    f"{mode}_{name}" for mode in ("missing_bearer", "invalid_bearer") for name in RESOURCES
) + ("password_auth", "auth_identity") + tuple("read_" + name for name in RESOURCES) + (
    "journey_consistency", "session_logout_local")
NOT_RUN = ("add_application", "duplicate_application", "application_detail",
           "hosted_partial_initialization", "same_user_token_refresh_during_write",
           "cross_user_isolation", "material_upload", "physical_arm_device",
           "server_write_capability")
FAILURES = frozenset(("CONTEXT", "TARGET", "CREDENTIALS", "REQUEST_NOT_ALLOWED",
                      "REDIRECT", "NETWORK", "HTTP_STATUS", "JSON", "SHAPE",
                      "IDENTITY", "TOKEN_TARGET", "CACHE", "LANGUAGE", "BASELINE_CHANGED",
                      "AI_ENABLED", "BEARER_BOUNDARY", "CONSISTENCY", "DEADLINE",
                      "INTERRUPTED", "UNEXPECTED"))
UUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\Z")
STAGES = ("study_profile", "school_plan", "applications", "offer_decision", "visa", "pre_departure", "arrival", "settling_in")
PROFILE_TEXT = ("educationLevel", "currentInstitution", "currentMajor", "gpa", "gradingScale",
                "graduationYear", "experiences", "targetDegree", "targetCountries", "targetFields",
                "intakeYear", "intakeTerm", "annualBudgetMin", "annualBudgetMax", "budgetCurrency",
                "cityPreferences", "rankingPriority", "careerGoal")


class Failure(Exception):
    def __init__(self, code):
        self.code = code if code in FAILURES else "UNEXPECTED"
        super().__init__(self.code)


def require(condition, code="SHAPE"):
    if not condition:
        raise Failure(code)


def shape(value, fields):
    require(isinstance(value, dict) and set(value) == set(fields))
    return value


def is_uuid(value):
    return isinstance(value, str) and UUID.fullmatch(value) is not None


def is_count(value):
    return type(value) is int and value >= 0


def context():
    require(sys.platform == "linux" and os.environ.get("GITHUB_ACTIONS") == "true"
            and os.environ.get("GITHUB_REPOSITORY") == REPOSITORY
            and os.environ.get("GITHUB_REF") == BRANCH
            and os.environ.get("GITHUB_EVENT_NAME") in ("push", "workflow_dispatch")
            and os.environ.get("RUNNER_DEBUG") != "1"
            and os.environ.get("ACTIONS_STEP_DEBUG", "").lower() != "true", "CONTEXT")
    try:
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
        require(event["repository"]["visibility"] == "public"
                and event["repository"]["full_name"] == REPOSITORY
                and "pull_request" not in event, "CONTEXT")
        sha = os.environ.get("GITHUB_SHA", "")
        require(re.fullmatch(r"[0-9a-f]{40}", sha) is not None, "CONTEXT")
        result = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True,
                                timeout=5, check=False, env={
                                    k: v for k, v in os.environ.items() if k not in SECRET_NAMES})
        require(result.returncode == 0 and result.stdout.decode().strip() == sha, "CONTEXT")
        return sha
    except Failure:
        raise
    except Exception:
        raise Failure("CONTEXT") from None


def target():
    require(os.environ.get("EXPO_PUBLIC_APP_ENV") == "preview"
            and os.environ.get("EXPO_PUBLIC_ATLAS_API_URL") == API
            and os.environ.get("EXPO_PUBLIC_SUPABASE_URL") == SUPABASE
            and os.environ.get("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY") == PUBLIC_KEY,
            "TARGET")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise Failure("REDIRECT")


class Client:
    def __init__(self):
        # No proxy/cookie handlers, SDK persistence, retries, or arbitrary URLs.
        self.opener = build_opener(ProxyHandler({}), NoRedirect())

    def request(self, route, token=None, credentials=None):
        body = None
        headers = {"Accept": "application/json", "Accept-Language": "zh-CN"}
        if route in RESOURCES:
            require(credentials is None, "REQUEST_NOT_ALLOWED")
            url, method = API + "/api/mobile/v1/" + route, "GET"
        else:
            require(route in ("password_auth", "auth_identity", "session_logout_local"), "REQUEST_NOT_ALLOWED")
            headers["apikey"] = PUBLIC_KEY
            if route == "password_auth":
                require(token is None and isinstance(credentials, dict)
                        and set(credentials) == {"email", "password"}, "REQUEST_NOT_ALLOWED")
                url, method = SUPABASE + "/auth/v1/token?grant_type=password", "POST"
                body = json.dumps(credentials).encode()
                headers["Content-Type"] = "application/json"
            else:
                require(credentials is None and token is not None, "REQUEST_NOT_ALLOWED")
                url, method = ((SUPABASE + "/auth/v1/user", "GET") if route == "auth_identity"
                               else (SUPABASE + "/auth/v1/logout?scope=local", "POST"))
        if token is not None:
            require(isinstance(token, str) and re.fullmatch(r"[A-Za-z0-9_.-]{1,16384}", token) is not None,
                    "REQUEST_NOT_ALLOWED")
            headers["Authorization"] = "Bearer " + token
        response = None
        try:
            try:
                response = self.opener.open(Request(url, data=body, headers=headers, method=method), timeout=10)
            except HTTPError as error:
                response = error
            # Even redirect-shaped HTTPError responses are rejected before any body read.
            require(not 300 <= response.code < 400 and response.geturl() == url, "REDIRECT")
            raw = response.read(1_048_577)
            require(len(raw) <= 1_048_576, "JSON")
            values = {k.lower(): v for k, v in response.headers.items()}
            if not raw and response.code == 204:
                return response.code, values, None
            require(values.get("content-type", "").split(";", 1)[0].strip().lower() == "application/json", "JSON")
            try:
                data = json.loads(raw)
            except Exception:
                raise Failure("JSON") from None
            return response.code, values, data
        except Failure:
            raise
        except Exception:
            raise Failure("NETWORK") from None
        finally:
            if response is not None:
                response.close()


def mobile_response(response, expected_status):
    status, headers, data = response
    require(status == expected_status, "HTTP_STATUS")
    cache = {part.strip().lower() for part in headers.get("cache-control", "").split(",")}
    vary = {part.strip().lower() for part in headers.get("vary", "").split(",")}
    require({"private", "no-store"} <= cache and {"authorization", "accept-language"} <= vary, "CACHE")
    require(isinstance(data, dict) and isinstance(data.get("meta"), dict)
            and data["meta"].get("schemaVersion") == "1")
    if expected_status == 401:
        require("data" not in data and isinstance(data.get("error"), dict)
                and data["error"].get("code") == "UNAUTHENTICATED", "BEARER_BOUNDARY")
        return None
    require(headers.get("content-language") == "zh", "LANGUAGE")
    shape(data, ("data", "meta"))
    shape(data["meta"], ("requestId", "generatedAt", "schemaVersion"))
    require(is_uuid(data["meta"]["requestId"]) and isinstance(data["meta"]["generatedAt"], str))
    require(isinstance(data["data"], dict))
    return data["data"]


def matter(value):
    shape(value, ("id", "stage", "title", "description", "status", "dueAt", "dependencyTaskIds", "action"))
    require(all(isinstance(value[k], str) for k in ("id", "title", "description"))
            and value["stage"] in STAGES
            and value["status"] in ("ready", "in_progress", "waiting", "blocked", "completed")
            and (value["dueAt"] is None or isinstance(value["dueAt"], str))
            and isinstance(value["dependencyTaskIds"], list)
            and all(isinstance(k, str) for k in value["dependencyTaskIds"]))
    action = shape(value["action"], ("enabled", "kind", "resourceId"))
    require(type(action["enabled"]) is bool and (action["resourceId"] is None or is_uuid(action["resourceId"])))
    kinds = ("OPEN_PROFILE", "OPEN_SCHOOL_PLAN", "OPEN_APPLICATIONS", "OPEN_APPLICATION", "OPEN_MATERIALS",
             "OPEN_JOURNEY", "OPEN_VISA", "OPEN_PRE_DEPARTURE", "OPEN_ARRIVAL", "OPEN_SETTLING")
    require(action["kind"] in kinds if action["enabled"] else action["kind"] is None and action["resourceId"] is None)


def validate_resource(name, data, user_id, email):
    if name == "me":
        shape(data, ("user", "profile", "preferences", "privacy"))
        user = shape(data["user"], ("id", "email", "displayName"))
        require(user["id"] == user_id and isinstance(user["email"], str)
                and user["email"].casefold() == email.casefold(), "IDENTITY")
        require(data["preferences"].get("locale") == "zh", "LANGUAGE")
        require(data["profile"].get("status") in ("draft", "ready", "archived"))
        require(data["privacy"].get("aiMatchingAvailable") is False, "AI_ENABLED")
    elif name == "profile":
        shape(data, ("values", "summary", "profileStatus", "pendingFacts"))
        values = shape(data["values"], PROFILE_TEXT + ("languages", "acceptMajorChange", "acceptPathway"))
        require(all(isinstance(values[k], str) for k in PROFILE_TEXT)
                and all(type(values[k]) is bool for k in ("acceptMajorChange", "acceptPathway"))
                and isinstance(values["languages"], list) and len(values["languages"]) <= 5)
        for row in values["languages"]:
            shape(row, ("language", "qualification", "result"))
            require(all(isinstance(v, str) for v in row.values()))
        summary = shape(data["summary"], ("confirmedCount", "pendingCount", "missingCount", "completeness", "missingLabels", "nextPriority"))
        require(all(is_count(summary[k]) for k in ("confirmedCount", "pendingCount", "missingCount", "completeness"))
                and summary["completeness"] <= 100 and isinstance(summary["missingLabels"], list)
                and all(isinstance(v, str) for v in summary["missingLabels"])
                and isinstance(summary["nextPriority"], str)
                and data["profileStatus"] in ("draft", "ready", "archived") and isinstance(data["pendingFacts"], list))
    elif name in ("applications", "recommendations"):
        shape(data, ("items",) if name == "applications" else ("items", "generation"))
        require(data["items"] == [], "BASELINE_CHANGED")
        if name == "recommendations":
            generation = shape(data["generation"], ("enabled", "profileStale", "runStatus"))
            require(generation["enabled"] is False, "AI_ENABLED")
            require(type(generation["profileStale"]) is bool and generation["runStatus"] in
                    (None, "queued", "filtering", "generating", "validating", "completed", "failed", "cancelled"))
    else:
        fields = (("currentStage", "completed", "primary", "matters") if name == "current-matters" else
                  ("currentStage", "completed", "currentTask", "stages", "tasks", "settling"))
        shape(data, fields)
        require(data["currentStage"] in STAGES and type(data["completed"]) is bool)
        primary = data["primary" if name == "current-matters" else "currentTask"]
        if primary is not None:
            matter(primary)
        rows = data["matters" if name == "current-matters" else "tasks"]
        require(isinstance(rows, list))
        for row in rows:
            matter(row)
        if name == "journey":
            require(isinstance(data["stages"], list))
            for row in data["stages"]:
                shape(row, ("id", "state"))
                require(row["id"] in STAGES and row["state"] in ("completed", "current", "upcoming"))
            # This designated pre-application account must not be an arrival fixture.
            require(data["settling"] is None, "BASELINE_CHANGED")


class Acceptance:
    def __init__(self, client):
        self.client, self.checks, self.phase = client, {}, "context"
        self.token, self.auth_attempted = None, False
        self.failure, self.cleanup, self.sha = None, "NOT_NEEDED", None
        self.last_status = None

    def request(self, route, **kwargs):
        self.last_status = None
        response = self.client.request(route, **kwargs)
        self.last_status = response[0]
        return response

    def passed(self):
        self.checks[self.phase] = "PASS"

    def run(self, email, password):
        require(isinstance(email, str) and email == email.strip() and 0 < len(email) <= 254
                and isinstance(password, str) and 0 < len(password) <= 256, "CREDENTIALS")
        for mode in ("missing_bearer", "invalid_bearer"):
            for resource in RESOURCES:
                self.phase = mode + "_" + resource
                mobile_response(self.request(resource, token="invalid-token" if mode == "invalid_bearer" else None), 401)
                self.passed()
        user = self.authenticate(email, password)
        reads = {}
        for resource in RESOURCES:
            self.phase = "read_" + resource
            data = mobile_response(self.request(resource, token=self.token), 200)
            validate_resource(resource, data, user["id"], email)
            reads[resource] = data
            self.passed()
        self.phase = "journey_consistency"
        require(all(reads["journey"][key] == reads["current-matters"][key]
                    for key in ("currentStage", "completed")), "CONSISTENCY")
        self.passed()

    def authenticate(self, email, password):
        self.phase = "password_auth"
        self.auth_attempted = True
        status, _, result = self.request("password_auth", credentials={"email": email, "password": password})
        require(status == 200, "HTTP_STATUS")
        require(isinstance(result, dict) and isinstance(result.get("access_token"), str), "IDENTITY")
        self.token = result["access_token"]
        require(re.fullmatch(r"[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", self.token) is not None, "TOKEN_TARGET")
        try:
            segment = self.token.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4)))
        except Exception:
            raise Failure("TOKEN_TARGET") from None
        user = result.get("user", {})
        require(isinstance(user, dict) and is_uuid(user.get("id")) and isinstance(user.get("email"), str)
                and user["email"].casefold() == email.casefold(), "IDENTITY")
        # Sanity-check the fixed issuer; only the Auth /user roundtrip below verifies identity.
        require(isinstance(claims, dict) and claims.get("iss") == SUPABASE + "/auth/v1"
                and claims.get("sub") == user["id"] and claims.get("role") == "authenticated"
                and (claims.get("aud") == "authenticated" or claims.get("aud") == ["authenticated"])
                and is_uuid(claims.get("session_id")), "TOKEN_TARGET")
        self.passed()
        self.phase = "auth_identity"
        status, _, verified = self.request("auth_identity", token=self.token)
        require(status == 200, "HTTP_STATUS")
        require(isinstance(verified, dict) and verified.get("id") == user["id"]
                and isinstance(verified.get("email"), str) and verified["email"].casefold() == email.casefold(), "IDENTITY")
        self.passed()
        return user

    def close(self):
        if not self.token:
            self.cleanup = "UNCONFIRMED" if self.auth_attempted else "NOT_NEEDED"
            return
        previous_phase, previous_status = self.phase, self.last_status
        self.phase = "session_logout_local"
        try:
            status, _, _ = self.request("session_logout_local", token=self.token)
            require(status == 204, "HTTP_STATUS")
            self.passed()
            self.cleanup = "LOCAL_LOGOUT_CONFIRMED"
        except BaseException:
            self.checks[self.phase] = "FAIL"
            self.cleanup = "UNCONFIRMED"
        finally:
            self.token = None
            self.phase, self.last_status = previous_phase, previous_status

    def report(self):
        complete = all(self.checks.get(check) == "PASS" for check in CHECKS)
        data = {"status": "PASS" if complete and not self.failure else "FAIL",
                "scope": "authenticated_empty_hosted_api_reads", "backendSourceSha": BACKEND_SHA,
                "deploymentId": DEPLOYMENT, "targetUrl": API,
                "cleanup": self.cleanup if self.cleanup in ("NOT_NEEDED", "UNCONFIRMED", "LOCAL_LOGOUT_CONFIRMED") else "UNCONFIRMED",
                "releaseReadiness": "NOT_READY",
                "checks": [{"check": check, "status": self.checks.get(check) if self.checks.get(check) in ("PASS", "FAIL") else "NOT_RUN"}
                           for check in CHECKS] + [{"check": check, "status": "NOT_RUN"} for check in NOT_RUN]}
        if isinstance(self.sha, str) and re.fullmatch(r"[0-9a-f]{40}", self.sha):
            data["sourceSha"] = self.sha
        if self.failure:
            data["failure"] = self.failure if self.failure in FAILURES else "UNEXPECTED"
            data["phase"] = self.phase if self.phase in CHECKS else "context"
            if type(self.last_status) is int and 100 <= self.last_status <= 599:
                data["httpStatus"] = self.last_status
        return data


def interrupted(number, _frame):
    raise Failure("DEADLINE" if number == signal.SIGALRM else "INTERRUPTED")


def main():
    acceptance = Acceptance(Client())
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    signal.signal(signal.SIGALRM, interrupted)
    signal.alarm(180)
    try:
        acceptance.sha = context()
        acceptance.passed()
        acceptance.phase = "target"
        target()
        acceptance.passed()
        acceptance.run(*(os.environ.get(key, "") for key in SECRET_NAMES))
    except BaseException as error:
        acceptance.failure = error.code if isinstance(error, Failure) else "UNEXPECTED"
        acceptance.checks[acceptance.phase] = "FAIL"
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.alarm(15)
        acceptance.close()
        signal.alarm(0)
    rendered = json.dumps(acceptance.report(), sort_keys=True)
    print(rendered, flush=True)
    try:
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as output:
                output.write("```json\n" + rendered + "\n```\n")
    except Exception:
        pass
    return 0 if acceptance.report()["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
