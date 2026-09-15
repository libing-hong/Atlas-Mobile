"""Regressions for actual Android selector/IME automation defects; no account data."""

import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

SOURCE = Path(__file__).resolve().parents[2] / "scripts" / "android-profile-e2e.py"
SPEC = importlib.util.spec_from_file_location("profile_acceptance", SOURCE)
acceptance = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(acceptance)


def ime_state(shown, service_view=True):
    # Exact live-state boundaries from AOSP android-15.0.0_r1. History and
    # InputMethodService view state deliberately disagree with live visibility.
    return ("Current Input Method Manager state:\n"
            f"  mInputShown={str(shown).lower()}\n"
            "  mStartInputHistory:\n    mInputShown=true\n"
            f"mIsInputViewShown={str(service_view).lower()}\n").encode()


class KeyboardRegression(unittest.TestCase):
    def test_stale_service_and_history_flags_do_not_show_hidden_keyboard(self):
        self.assertFalse(acceptance.current_ime_shown(ime_state(False, True)))
        self.assertTrue(acceptance.current_ime_shown(ime_state(True, False)))

    def test_missing_or_ambiguous_live_state_is_rejected(self):
        original = ime_state(False)
        for state in (b"mInputShown=true", original + original,
                      original.replace(b"  mInputShown=false", b"  mInputShown=false\n  mInputShown=true"),
                      original.replace(b"  mStartInputHistory:", b"unknown section:")):
            with self.subTest(state=state), self.assertRaises(acceptance.Failure) as result:
                acceptance.current_ime_shown(state)
            self.assertEqual(result.exception.code, "KEYBOARD_STATE_UNKNOWN")

    def test_hidden_keyboard_never_sends_back(self):
        device = object.__new__(acceptance.Android)
        calls = []
        def shell(*args, **kwargs):
            calls.append(args)
            return ime_state(False, True)
        device.shell = shell
        device.hide_keyboard()
        self.assertEqual(calls, [("dumpsys", "input_method")])

    def test_visible_keyboard_sends_only_one_back_then_confirms_hidden(self):
        device = object.__new__(acceptance.Android)
        states = iter([ime_state(True), ime_state(False)])
        backs = []
        def shell(*args, **kwargs):
            if args == ("dumpsys", "input_method"):
                return next(states)
            backs.append(args)
            return b""
        device.shell = shell
        with patch.object(acceptance.time, "sleep"):
            device.hide_keyboard()
        self.assertEqual(backs, [("input", "keyevent", "KEYCODE_BACK")])

    def test_uncertain_hide_fails_without_a_second_back(self):
        device = object.__new__(acceptance.Android)
        backs = []
        def shell(*args, **kwargs):
            if args == ("dumpsys", "input_method"):
                return ime_state(True)
            backs.append(args)
            return b""
        device.shell = shell
        with patch.object(acceptance.time, "monotonic", side_effect=range(0, 100, 2)), \
             patch.object(acceptance.time, "sleep"), self.assertRaises(acceptance.Failure) as result:
            device.hide_keyboard()
        self.assertEqual(result.exception.code, "KEYBOARD_STATE_UNKNOWN")
        self.assertEqual(backs, [("input", "keyevent", "KEYCODE_BACK")])


class ButtonRegression(unittest.TestCase):
    def test_disabled_button_does_not_inherit_enabled_text_child(self):
        # Relevant attributes from the retained anonymous API 35 XML evidence.
        root = ET.fromstring('''<hierarchy><node package="com.libinghong.atlasmobile.preview"
          class="android.widget.Button" content-desc="登录" clickable="true" enabled="false"
          bounds="[54,1318][1026,1443]"><node package="com.libinghong.atlasmobile.preview"
          class="android.widget.TextView" text="登录" clickable="false" enabled="true"
          bounds="[504,1354][576,1407]" /></node></hierarchy>''')
        device = object.__new__(acceptance.Android)
        target = device.find(root, "登录", actionable=True)
        self.assertEqual(target.get("class"), "android.widget.Button")
        with self.assertRaises(acceptance.Failure) as result:
            device.tap_node(target)
        self.assertEqual(result.exception.code, "UI_ACTION_DISABLED")


if __name__ == "__main__":
    unittest.main()
