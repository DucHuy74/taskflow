import threading
import time
import unittest
from unittest.mock import MagicMock

from src.services.parsing.parse_orchestrator import ParseOrchestrator, is_complete_svo


class TestParseOrchestrator(unittest.TestCase):

    def setUp(self):
        self.standard = MagicMock()
        self.generic = MagicMock()
        self.w2v = MagicMock()
        self.orchestrator = ParseOrchestrator(
            standard_parser=self.standard,
            generic_parser=self.generic,
            w2v_assigner=self.w2v,
        )

    def test_uses_standard_when_complete(self):
        self.standard.parse.return_value = {
            "subject": "user",
            "action": "login",
            "object": "account",
            "status": "VALID",
        }
        result = self.orchestrator.parse("As a user, I want to login")

        self.assertEqual(result["parse_method"], "standard")
        self.assertEqual(result["confidence"], 1.0)
        self.generic.parse.assert_not_called()
        self.w2v.parse.assert_not_called()

    def test_falls_back_to_generic_when_standard_incomplete(self):
        self.standard.parse.return_value = {
            "subject": None,
            "action": "allow",
            "object": "access",
            "status": "VALID",
        }
        self.generic.parse.return_value = {
            "subject": "admin",
            "action": "reset",
            "object": "password",
            "status": "VALID",
        }

        result = self.orchestrator.parse("Allow admin to reset password")

        self.assertEqual(result["parse_method"], "generic")
        self.assertEqual(result["action"], "reset")
        self.w2v.parse.assert_not_called()

    def test_falls_back_to_w2v_when_generic_incomplete(self):
        self.standard.parse.return_value = {"status": "ERROR"}
        self.generic.parse.return_value = {
            "subject": None,
            "action": None,
            "object": None,
            "status": "VALID",
        }
        self.w2v.parse.return_value = {
            "subject": "user",
            "action": "checkout",
            "object": "process",
            "status": "VALID",
            "confidence": 0.55,
        }

        result = self.orchestrator.parse("Users need faster checkout process")

        self.assertEqual(result["parse_method"], "w2v_corpus")
        self.assertEqual(result["confidence"], 0.55)

    def test_is_complete_requires_action_and_object(self):
        self.assertTrue(is_complete_svo({"status": "VALID", "action": "view", "object": "order"}))
        self.assertFalse(is_complete_svo({"status": "VALID", "action": "view"}))
        self.assertFalse(is_complete_svo({"status": "ERROR"}))


class TestParsingIntegration(unittest.TestCase):
    """Integration tests with spaCy + Word2Vec when models are available."""

    @classmethod
    def setUpClass(cls):
        try:
            from src.utils.model_loader import load_models
            cls.nlp, cls.word2vec = load_models()
            cls.models_available = True
        except Exception:
            cls.models_available = False

    def setUp(self):
        if not self.models_available:
            self.skipTest("spaCy / Word2Vec models not available")

        from src.services.analyze_parsing_service import AnalyzeParsingService

        self.parser = AnalyzeParsingService(self.nlp, self.word2vec)

    def test_standard_story(self):
        result = self.parser.parse(
            "As a user, I want to login so that I can access my account"
        )
        self.assertEqual(result["status"], "VALID")
        self.assertEqual(result["parse_method"], "standard")
        self.assertTrue(result.get("action"))
        self.assertTrue(result.get("object"))

    def test_imperative_story(self):
        result = self.parser.parse("Allow admin to reset password")
        self.assertEqual(result["status"], "VALID")
        self.assertIn(result["parse_method"], ("generic", "w2v_corpus", "standard"))
        self.assertTrue(result.get("action"))
        self.assertTrue(result.get("object"))

    def test_nominal_story(self):
        result = self.parser.parse("Password reset functionality for admin")
        self.assertEqual(result["status"], "VALID")
        self.assertTrue(result.get("action") or result.get("object"))

    def test_free_form_story(self):
        result = self.parser.parse("Users need faster checkout process")
        self.assertEqual(result["status"], "VALID")
        self.assertTrue(result.get("action") or result.get("object"))


if __name__ == "__main__":
    unittest.main()
