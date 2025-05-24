import os
from fastapi.testclient import TestClient
from app import app
# mcp-server/tests/test_accounts.py

client = TestClient(app)

os.environ["MCP_API_KEY"] = os.getenv("MCP_API_KEY", "changeme")

def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

def test_accounts_requires_auth():
    resp = client.get("/accounts/")
    assert resp.status_code == 401

