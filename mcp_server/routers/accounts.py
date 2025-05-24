"""FastAPI router for Azure NetApp Files *Accounts* operations."""

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from azure.identity import DefaultAzureCredential
from azure.mgmt.netapp import NetAppManagementClient
from azure.core.exceptions import HttpResponseError

# --- Env configuration ---
SUBSCRIPTION_ID = os.getenv("AZURE_SUBSCRIPTION_ID")
RESOURCE_GROUP  = os.getenv("AZURE_RESOURCE_GROUP")

if not SUBSCRIPTION_ID or not RESOURCE_GROUP:
    raise RuntimeError(
        "AZURE_SUBSCRIPTION_ID and AZURE_RESOURCE_GROUP must be set in the container environment"
    )

# -------- API key security --------
API_KEY = os.getenv("MCP_API_KEY", "changeme")

def verify_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

# -------- Azure SDK helper --------
def get_netapp_client() -> NetAppManagementClient:
    credential = DefaultAzureCredential()
    return NetAppManagementClient(credential, SUBSCRIPTION_ID)

# -------- DTOs --------
from pydantic import BaseModel, Field

class AccountCreateBody(BaseModel):
    name: str = Field(..., description="NetApp Account name")
    location: str = Field(..., description="Azure region, e.g. eastus")
    active_directory: Optional[dict] = None

# -------- Router --------
router = APIRouter(
    prefix="/accounts",
    tags=["accounts"],
    dependencies=[Depends(verify_key)]
)

def sdk_error(err: HttpResponseError) -> HTTPException:
    return HTTPException(status_code=err.status_code, detail=err.message)

@router.get("/", summary="List NetApp accounts")
async def list_accounts():
    try:
        accounts = get_netapp_client().accounts.list(RESOURCE_GROUP)
        return [acct.as_dict() for acct in accounts]
    except HttpResponseError as err:
        raise sdk_error(err)

@router.post("/", status_code=202, summary="Create a NetApp account")
async def create_account(
    body: AccountCreateBody,
    wait: bool = Query(False, description="Wait for the long‑running operation to finish")
):
    try:
        poller = get_netapp_client().accounts.begin_create_or_update(
            RESOURCE_GROUP,
            body.name,
            {
                "location": body.location,
                "properties": {
                    "activeDirectories": [body.active_directory] if body.active_directory else []
                },
            },
        )
        if wait:
            result = poller.result()
            return result.as_dict()
        return {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise sdk_error(err)

@router.delete("/{account_name}", status_code=202, summary="Delete a NetApp account")
async def delete_account(
    account_name: str,
    wait: bool = Query(False, description="Wait for completion")
):
    try:
        poller = get_netapp_client().accounts.begin_delete(RESOURCE_GROUP, account_name)
        if wait:
            poller.result()
            return {"status": "deleted"}
        return {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise sdk_error(err)

