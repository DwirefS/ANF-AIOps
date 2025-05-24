import os
from fastapi.testclient import TestClient
from mcp_server.app import app

client = TestClient(app)

def test_accounts_requires_auth():
    resp = client.get("/accounts/")
    assert resp.status_code == 401

