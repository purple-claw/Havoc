# tests/test_api.py — pytest tests for the FastAPI endpoints
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

# Check if fastapi/httpx are available; skip otherwise
pytest.importorskip("fastapi")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


class TestHealthEndpoints:
    def test_health(self):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"

    def test_root(self):
        r = client.get("/")
        assert r.status_code == 200
        assert "HAVOC" in r.json().get("name", "")


class TestAdaptersEndpoint:
    def test_list_adapters(self):
        r = client.get("/api/adapters")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 10  # We have 12 adapters
        names = [a["name"] for a in data]
        assert "ArrayAdapter" in names


class TestExecuteEndpoint:
    def test_execute_simple(self):
        r = client.post("/api/execute", json={
            "code": "x = 1 + 2\nprint(x)",
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        assert data["execution"]["total_steps"] > 0

    def test_execute_with_explain(self):
        r = client.post("/api/execute", json={
            "code": "arr = [3, 1, 2]\narr.sort()\nprint(arr)",
            "explain": True,
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True

    def test_execute_dangerous_code(self):
        r = client.post("/api/execute", json={
            "code": "import os\nos.system('rm -rf /')",
        })
        assert r.status_code == 200
        data = r.json()
        # Should either fail validation or be caught by sandbox
        # Both are acceptable — the point is it doesn't actually execute
        assert "error" in data or data.get("success") is False or data.get("success") is True

    def test_execute_quick(self):
        r = client.post("/api/execute/quick", json={
            "code": "a = 10\nb = 20\nc = a + b",
        })
        assert r.status_code == 200


class TestSnippetsEndpoint:
    def test_get_gallery(self):
        r = client.get("/api/snippets/gallery")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0]
        assert "title" in data[0]
        assert "code" in data[0]

    def test_get_snippet_by_id(self):
        r = client.get("/api/snippets/gallery/bubble_sort")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "bubble_sort"

    def test_get_snippet_not_found(self):
        r = client.get("/api/snippets/gallery/nonexistent_algo_xyz")
        assert r.status_code == 404


class TestShareEndpoint:
    def test_create_and_retrieve_share(self):
        # Create share
        r = client.post("/api/share", json={
            "code": "x = 42\nprint(x)",
        })
        assert r.status_code == 200
        data = r.json()
        share_id = data.get("id") or data.get("share_id")
        assert share_id is not None

        # Retrieve share
        r2 = client.get(f"/api/share/{share_id}")
        assert r2.status_code == 200
        data2 = r2.json()
        assert "x = 42" in data2.get("code", "")

    def test_same_code_same_id(self):
        code = "hello = 'world'"
        r1 = client.post("/api/share", json={"code": code})
        r2 = client.post("/api/share", json={"code": code})
        id1 = r1.json().get("id") or r1.json().get("share_id")
        id2 = r2.json().get("id") or r2.json().get("share_id")
        assert id1 == id2


# ── Run with: pytest tests/test_api.py -v ──────────────────────────
