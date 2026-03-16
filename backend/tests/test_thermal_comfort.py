"""Tests for thermal comfort API."""

import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.services.service_thermal_comfort import (
    calc_discomfort_index,
    calc_heat_index,
    calc_pmv_ppd,
    pmv_to_comfort_state,
)


class TestCalcDiscomfortIndex(unittest.TestCase):
    """Test calc_discomfort_index service function."""

    def test_returns_di_and_condition(self):
        di_val, condition = calc_discomfort_index(tdb=25, rh=50)
        self.assertIsInstance(di_val, float)
        self.assertIsInstance(condition, str)
        self.assertGreater(di_val, 0)
        self.assertTrue(
            "discomfort" in condition.lower() or "no discomfort" in condition.lower()
        )

    def test_low_temperature_low_rh(self):
        di_val, condition = calc_discomfort_index(tdb=20, rh=40)
        self.assertLess(di_val, 25)
        self.assertIsInstance(condition, str)


class TestCalcHeatIndex(unittest.TestCase):
    """Test calc_heat_index service function."""

    def test_returns_hi(self):
        hi_val = calc_heat_index(tdb=25, rh=50)
        self.assertIsInstance(hi_val, float)
        self.assertGreater(hi_val, 0)


class TestPmvToComfortState(unittest.TestCase):
    """Test pmv_to_comfort_state mapping."""

    def test_comfortable(self):
        self.assertEqual(pmv_to_comfort_state(0), "comfortable")
        self.assertEqual(pmv_to_comfort_state(-0.5), "comfortable")
        self.assertEqual(pmv_to_comfort_state(0.5), "comfortable")

    def test_slight_discomfort(self):
        self.assertEqual(pmv_to_comfort_state(-1.0), "slight discomfort")
        self.assertEqual(pmv_to_comfort_state(1.0), "slight discomfort")
        self.assertEqual(pmv_to_comfort_state(-1.5), "slight discomfort")
        self.assertEqual(pmv_to_comfort_state(1.5), "slight discomfort")

    def test_discomfort(self):
        self.assertEqual(pmv_to_comfort_state(-2), "discomfort")
        self.assertEqual(pmv_to_comfort_state(2), "discomfort")


class TestCalcPmvPpd(unittest.TestCase):
    """Test calc_pmv_ppd service function."""

    def test_returns_pmv_ppd_compliance(self):
        pmv_val, ppd_val, compliance = calc_pmv_ppd(tdb=25, rh=50)
        self.assertIsInstance(pmv_val, float)
        self.assertIsInstance(ppd_val, float)
        self.assertIsInstance(compliance, bool)


class TestThermalComfortEndpoints(unittest.TestCase):
    """Test thermal comfort API endpoints."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_discomfort_index_ok(self):
        response = self.client.get(
            "/thermal-comfort/discomfort-index",
            params={"tdb": 25, "rh": 50},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("di", data)
        self.assertIn("discomfort_condition", data)
        self.assertIsInstance(data["di"], (int, float))
        self.assertIsInstance(data["discomfort_condition"], str)

    def test_discomfort_index_missing_params(self):
        response = self.client.get("/thermal-comfort/discomfort-index")
        self.assertEqual(response.status_code, 422)

    def test_discomfort_index_invalid_rh(self):
        response = self.client.get(
            "/thermal-comfort/discomfort-index",
            params={"tdb": 25, "rh": 150},
        )
        self.assertEqual(response.status_code, 422)

    def test_heat_index_ok(self):
        response = self.client.get(
            "/thermal-comfort/heat-index",
            params={"tdb": 25, "rh": 50},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("hi", data)
        self.assertIsInstance(data["hi"], (int, float))

    def test_heat_index_missing_params(self):
        response = self.client.get("/thermal-comfort/heat-index")
        self.assertEqual(response.status_code, 422)

    def test_pmv_ppd_ok(self):
        response = self.client.get(
            "/thermal-comfort/pmv-ppd",
            params={"tdb": 25, "rh": 50},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("pmv", data)
        self.assertIn("ppd", data)
        self.assertIn("compliance", data)
        self.assertIn("comfort_state", data)
        self.assertIsInstance(data["pmv"], (int, float))
        self.assertIsInstance(data["ppd"], (int, float))
        self.assertIsInstance(data["compliance"], bool)
        self.assertIn(data["comfort_state"], ("comfortable", "slight discomfort", "discomfort"))

    def test_pmv_ppd_missing_params(self):
        response = self.client.get("/thermal-comfort/pmv-ppd")
        self.assertEqual(response.status_code, 422)
