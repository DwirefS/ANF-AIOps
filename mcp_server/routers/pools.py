\"\"\"FastAPI router for Azure NetApp Files *Capacity Pools* operations.\"\"\"

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, Field
from azure.identity import DefaultAzureCredential
from azure.mgmt.netapp import NetAppManagementClient
from azure.core.exceptions import HttpResponseError

SUBSCRIPTION_ID = os.getenv("AZURE_SUBSCRIPTION_ID")
RESOURCE_GROUP  = os.getenv("AZURE_RESOURCE_GROUP")

API_KEY = os.getenv("MCP_API_KEY", "changeme")

def verify_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

def client() -> NetAppManagementClient:
    return NetAppManagementClient(DefaultAzureCredential(), SUBSCRIPTION_ID)

def sdk_error(err: HttpResponseError) -> HTTPException:
    return HTTPException(status_code=err.status_code, detail=err.message)

# ---------- DTO ----------
class PoolBody(BaseModel):
    account: str = Field(..., description="NetApp account name")
    pool: str = Field(..., description="Capacity pool name")
    location: str = Field(..., description="Azure region")
    size_tb: int = Field(..., description="Pool size in TiB")
    service_level: str = Field(..., description="Ultra | Premium | Standard | StandardZRS")

router = APIRouter(
    prefix="/pools",
    tags=["pools"],
    dependencies=[Depends(verify_key)]
)

@router.get("/", summary="List pools in an account")
async def list_pools(account: str):
    try:
        pools = client().pools.list(RESOURCE_GROUP, account)
        return [p.as_dict() for p in pools]
    except HttpResponseError as err:
        raise sdk_error(err)

@router.post("/", status_code=202, summary="Create capacity pool")
async def create_pool(body: PoolBody, wait: bool = Query(False)):
    try:
        params = {
            "location": body.location,
            "sku": {"name": body.service_level},
            "size": body.size_tb * 1024 ** 4  # bytes
        }
        poller = client().pools.begin_create_or_update(
            RESOURCE_GROUP, body.account, body.pool, params
        )
        if wait:
            return poller.result().as_dict()
        return {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise sdk_error(err)

@router.patch("/", status_code=202, summary="Resize pool (size_tb) or change service_level")
async def update_pool(
    account: str,
    pool: str,
    new_size_tb: Optional[int] = None,
    service_level: Optional[str] = None,
    wait: bool = Query(False)
):
    if new_size_tb is None and service_level is None:
        raise HTTPException(status_code=400, detail="Specify new_size_tb or service_level")
    body = {}
    if new_size_tb:
        body["size"] = new_size_tb * 1024 ** 4
    if service_level:
        body["sku"] = {"name": service_level}
    try:
        poller = client().pools.begin_create_or_update(
            RESOURCE_GROUP, account, pool, body
        )
        if wait:
            return poller.result().as_dict()
        return {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise sdk_error(err)

@router.delete("/", status_code=202, summary="Delete capacity pool")
async def delete_pool(account: str, pool: str, wait: bool = Query(False)):
    try:
        poller = client().pools.begin_delete(RESOURCE_GROUP, account, pool)
        if wait:
            poller.result()
            return {"status": "deleted"}
        return {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise sdk_error(err)

