"""Main FastAPI application for ANF MCP."""

import os
from fastapi import FastAPI, Header, HTTPException
from .routers import accounts, pools

API_KEY = os.getenv("MCP_API_KEY", "changeme")

def verify_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

app = FastAPI(title="ANF MCP API", version="0.1.0")

# Register routers
app.include_router(pools.router)
app.include_router(accounts.router)

@app.get("/health", tags=["meta"])
async def health():
    """Liveness probe."""
    return {"status": "ok"}
