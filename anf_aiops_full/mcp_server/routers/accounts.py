"""FastAPI router for Azure NetApp Files *Accounts* operations."""

import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, Field
from azure.identity import DefaultAzureCredential
from azure.mgmt.netapp import NetAppManagementClient
from azure.core.exceptions import HttpResponseError

SUBSCRIPTION_ID = os.getenv("AZURE_SUBSCRIPTION_ID", "dummy")
RESOURCE_GROUP  = os.getenv("AZURE_RESOURCE_GROUP", "dummy")
API_KEY = os.getenv("MCP_API_KEY", "changeme")

def verify_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

def client():
    return NetAppManagementClient(DefaultAzureCredential(), SUBSCRIPTION_ID)

def sdk_error(err: HttpResponseError):
    return HTTPException(status_code=err.status_code, detail=err.message)

class AccountCreateBody(BaseModel):
    name: str = Field(..., description="NetApp account name")
    location: str = Field(..., description="Azure region (eastus, etc.)")
    active_directory: Optional[dict] = None

router = APIRouter(prefix="/accounts", tags=["accounts"], dependencies=[Depends(verify_key)])

@router.get("/", summary="List NetApp accounts")
async def list_accounts():
    try:
        accts = client().accounts.list(RESOURCE_GROUP)
        return [a.as_dict() for a in accts]
    except HttpResponseError as err:
        raise sdk_error(err)

@router.post("/", status_code=202, summary="Create account")
async def create_account(body: AccountCreateBody, wait: bool = Query(False)):
    try:
        poller = client().accounts.begin_create_or_update(
            RESOURCE_GROUP,
            body.name,
            {"location": body.location,
             "properties": {"activeDirectories": [body.active_directory]} if body.active_directory else {}}
        )
        if wait:
            return poller.result().as_dict()
        return {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise sdk_error(err)

@router.delete("/{account_name}", status_code=202, summary="Delete account")
async def delete_account(account_name: str, wait: bool = Query(False)):
    try:
        poller = client().accounts.begin_delete(RESOURCE_GROUP, account_name)
        if wait:
            poller.result()
            return {"status": "deleted"}
        return {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise sdk_error(err)

