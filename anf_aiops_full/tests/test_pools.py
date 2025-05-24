import os
from fastapi.testclient import TestClient
from mcp_server.app import app

client = TestClient(app)

def test_pools_requires_auth():
    resp = client.get("/pools/?account=foo")
    assert resp.status_code == 401

