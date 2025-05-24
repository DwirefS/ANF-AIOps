import os
from fastapi.testclient import TestClient
from app import app
# mcp-server/tests/test_accounts.py
from mcp_server.app import app

client = TestClient(app)
os.environ["MCP_API_KEY"] = os.getenv("MCP_API_KEY", "changeme")

def test_pools_auth_required():
    resp = client.get("/pools/?account=foo")
    assert resp.status_code == 401

