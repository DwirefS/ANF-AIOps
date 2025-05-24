from fastapi.testclient import TestClient
from mcp_server.app import app

client = TestClient(app)

def test_accounts_need_auth():
    resp = client.get("/accounts/")
    assert resp.status_code == 401

def test_pools_need_auth():
    resp = client.get("/pools/?account=foo")
    assert resp.status_code == 401
