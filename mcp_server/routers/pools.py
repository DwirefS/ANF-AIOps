"""Capacity Pools router covering list / create / update / delete."""

import os
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Query, Depends
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

def _client():
    return NetAppManagementClient(DefaultAzureCredential(), SUBSCRIPTION_ID)

def _err(err: HttpResponseError):
    return HTTPException(status_code=err.status_code, detail=err.message)

class PoolSpec(BaseModel):
    account: str
    pool: str
    location: str
    size_tb: int = Field(..., gt=0)
    service_level: str = Field(..., regex="^(Ultra|Premium|Standard|StandardZRS)$")

router = APIRouter(prefix="/pools", tags=["pools"], dependencies=[Depends(verify_key)])

@router.get("/", summary="List pools under an account")
async def list_pools(account: str):
    try:
        pools = _client().pools.list(RESOURCE_GROUP, account)
        return [p.as_dict() for p in pools]
    except HttpResponseError as err:
        raise _err(err)

@router.post("/", status_code=202, summary="Create pool")
async def create_pool(spec: PoolSpec, wait: bool = Query(False)):
    try:
        params = {
            "location": spec.location,
            "sku": {"name": spec.service_level},
            "size": spec.size_tb * 1024 ** 4,
        }
        poller = _client().pools.begin_create_or_update(RESOURCE_GROUP, spec.account, spec.pool, params)
        return poller.result().as_dict() if wait else {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise _err(err)

@router.patch("/", status_code=202, summary="Resize or change tier")
async def update_pool(
    account: str,
    pool: str,
    new_size_tb: Optional[int] = None,
    service_level: Optional[str] = None,
    wait: bool = Query(False),
):
    if new_size_tb is None and service_level is None:
        raise HTTPException(status_code=400, detail="Specify new_size_tb or service_level")
    body = {}
    if new_size_tb:
        body["size"] = new_size_tb * 1024 ** 4
    if service_level:
        body["sku"] = {"name": service_level}
    try:
        poller = _client().pools.begin_create_or_update(RESOURCE_GROUP, account, pool, body)
        return poller.result().as_dict() if wait else {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise _err(err)

@router.delete("/", status_code=202, summary="Delete pool")
async def delete_pool(account: str, pool: str, wait: bool = Query(False)):
    try:
        poller = _client().pools.begin_delete(RESOURCE_GROUP, account, pool)
        if wait:
            poller.result()
            return {"status": "deleted"}
        return {"operation": poller.polling_url()}
    except HttpResponseError as err:
        raise _err(err)
