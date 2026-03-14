import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


SAMPLE_PAYLOAD = [
    {
        "device_id": "portable-112",
        "metric": "co2",
        "value": 458,
        "unit": "ppm",
        "event_time": "2026-03-13T21:20:51.941486",
    },
    {
        "device_id": "portable-112",
        "metric": "relative_humidity",
        "value": 67.83,
        "unit": "%",
        "event_time": "2026-03-13T21:20:51.941486",
    },
    {
        "device_id": "portable-112",
        "metric": "temperature",
        "value": 16.18,
        "unit": "C",
        "event_time": "2026-03-13T21:20:51.941486",
    },
]

AGGREGATED_HISTORY_PAYLOAD = {
    "device_id": "portable-112",
    "count": 2,
    "items": [
        {
            "device_id": "portable-112",
            "event_time": "2026-03-14T16:00:00",
            "measurements": {
                "co2": {"value": 441.8, "unit": "ppm"},
                "pm25": {"value": 0, "unit": "ug/m3"},
                "relative_humidity": {"value": 61.3, "unit": "%"},
                "temperature": {"value": 16, "unit": "C"},
                "voc": {"value": 111.8, "unit": None},
            },
        },
        {
            "device_id": "portable-112",
            "event_time": "2026-03-14T15:00:00",
            "measurements": {
                "co2": {"value": 430.5, "unit": "ppm"},
                "pm25": {"value": 0, "unit": "ug/m3"},
                "relative_humidity": {"value": 61, "unit": "%"},
                "temperature": {"value": 16, "unit": "C"},
                "voc": {"value": 101.1, "unit": None},
            },
        },
    ],
}


class OverviewRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("app.services.service_overview.fetch_device_latest")
    def test_latest_overview_happy_path(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_PAYLOAD

        response = self.client.get("/overview/devices/portable-112/latest")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "device_id": "portable-112",
                "latest_event_time": "2026-03-13T21:20:51.941486",
                "readings": {
                    "co2": {"value": 458, "unit": "ppm"},
                    "relative_humidity": {"value": 67.83, "unit": "%"},
                    "temperature": {"value": 16.18, "unit": "C"},
                },
            },
        )

    @patch("app.services.service_overview.fetch_device_latest")
    def test_latest_overview_allows_missing_metrics(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_PAYLOAD[:1]

        response = self.client.get("/overview/devices/portable-112/latest")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["readings"],
            {"co2": {"value": 458, "unit": "ppm"}},
        )

    @patch("app.services.service_overview.fetch_device_latest")
    def test_latest_overview_empty_payload_returns_404(self, mock_fetch):
        mock_fetch.return_value = []

        response = self.client.get("/overview/devices/portable-112/latest")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"],
            "No latest data found for device 'portable-112'",
        )

    @patch("app.services.service_overview.fetch_device_latest")
    def test_latest_overview_invalid_row_returns_502(self, mock_fetch):
        mock_fetch.return_value = [{"device_id": "portable-112", "metric": "co2"}]

        response = self.client.get("/overview/devices/portable-112/latest")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json()["detail"],
            "Malformed upstream device payload",
        )

    @patch("app.services.service_overview.fetch_device_latest")
    def test_latest_overview_rejects_mixed_device_ids(self, mock_fetch):
        mock_fetch.return_value = [
            SAMPLE_PAYLOAD[0],
            {
                "device_id": "portable-999",
                "metric": "temperature",
                "value": 16.18,
                "unit": "C",
                "event_time": "2026-03-13T21:20:51.941486",
            },
        ]

        response = self.client.get("/overview/devices/portable-112/latest")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json()["detail"],
            "Malformed upstream device payload",
        )

    @patch("app.services.service_overview.fetch_device_history")
    def test_device_history_returns_validated_buckets(self, mock_fetch):
        mock_fetch.return_value = AGGREGATED_HISTORY_PAYLOAD

        response = self.client.get(
            "/overview/devices/portable-112/history?aggregate=avg&bucket_unit=hour&bucket_size=1&limit=24"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), AGGREGATED_HISTORY_PAYLOAD)

    @patch("app.services.service_overview.fetch_device_history")
    def test_device_history_invalid_payload_returns_502(self, mock_fetch):
        mock_fetch.return_value = [{"device_id": "portable-112"}]

        response = self.client.get(
            "/overview/devices/portable-112/history?aggregate=avg&bucket_unit=hour&bucket_size=1&limit=24"
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json()["detail"],
            "Malformed upstream device payload",
        )

    @patch("app.services.service_overview.fetch_device_history")
    def test_device_history_rejects_mismatched_root_device_id(self, mock_fetch):
        mock_fetch.return_value = {
            **AGGREGATED_HISTORY_PAYLOAD,
            "device_id": "portable-999",
        }

        response = self.client.get(
            "/overview/devices/portable-112/history?aggregate=avg&bucket_unit=hour&bucket_size=1&limit=24"
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json()["detail"],
            "Malformed upstream device payload",
        )

    @patch("app.services.service_overview.fetch_device_history")
    def test_device_history_rejects_mixed_device_ids(self, mock_fetch):
        mock_fetch.return_value = {
            **AGGREGATED_HISTORY_PAYLOAD,
            "items": [
                AGGREGATED_HISTORY_PAYLOAD["items"][0],
                {
                    **AGGREGATED_HISTORY_PAYLOAD["items"][1],
                    "device_id": "portable-999",
                },
            ],
        }

        response = self.client.get(
            "/overview/devices/portable-112/history?aggregate=avg&bucket_unit=hour&bucket_size=1&limit=24"
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json()["detail"],
            "Malformed upstream device payload",
        )


if __name__ == "__main__":
    unittest.main()
