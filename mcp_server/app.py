import os
from fastapi import FastAPI, Header, HTTPException

# ✅ relative-package imports
from .routers import pools, accounts

app = FastAPI(title="ANF MCP API", version="0.1.0")
app.include_router(pools.router)
app.include_router(accounts.router)

API_KEY = os.getenv("MCP_API_KEY", "changeme")

def verify_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

@app.get("/health")
async def health():
    return {"status": "ok"}