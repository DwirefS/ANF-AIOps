import os
import requests

class ApiError(Exception):
    """Generic error raised on non‑success MCP response."""

class AnfMcpClient:
    def __init__(self, base_url: str, api_key: str | None = None, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key or os.getenv("MCP_API_KEY") or "changeme"
        self.timeout = timeout

    def _headers(self):
        return {"x-api-key": self.api_key}

    def _request(self, method: str, path: str, **kwargs):
        url = f"{self.base_url}{path}"
        resp = requests.request(method, url, headers=self._headers(), timeout=self.timeout, **kwargs)
        if resp.status_code >= 400:
            raise ApiError(f"{resp.status_code} {resp.text}")
        return resp.json()

    # ---------- Accounts ----------
    def list_accounts(self):
        return self._request("GET", "/accounts")

    def create_account(self, name: str, location: str):
        payload = {"account_name": name, "location": location}
        return self._request("POST", "/accounts", json=payload)
