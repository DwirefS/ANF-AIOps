"""Minimal MCP server for Azure NetApp Files.

Extend with more endpoints (pools, volumes, snapshots, etc.).
"""

import os
from typing import List

from fastapi import FastAPI, HTTPException, Header, Depends
from azure.identity import DefaultAzureCredential
from azure.mgmt.netapp import NetAppManagementClient

API_KEY = os.getenv("MCP_API_KEY", "changeme")
SUBSCRIPTION_ID = os.getenv("AZURE_SUBSCRIPTION_ID")
RESOURCE_GROUP = os.getenv("AZURE_RESOURCE_GROUP")

if not SUBSCRIPTION_ID or not RESOURCE_GROUP:
    raise RuntimeError("Environment vars AZURE_SUBSCRIPTION_ID and AZURE_RESOURCE_GROUP must be set")

app = FastAPI(title="ANF MCP API", version="0.1.0")

def get_client():
    cred = DefaultAzureCredential()
    return NetAppManagementClient(cred, SUBSCRIPTION_ID)

async def verify_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/accounts", dependencies=[Depends(verify_key)])
async def list_accounts():
    client = get_client()
    accounts = client.accounts.list(RESOURCE_GROUP)
    return [acct.as_dict() for acct in accounts]

@app.post("/accounts", dependencies=[Depends(verify_key)])
async def create_account(account_name: str, location: str):
    client = get_client()
    params = {"location": location}
    poller = client.accounts.begin_create_or_update(RESOURCE_GROUP, account_name, params)
    result = poller.result()
    return result.as_dict()
