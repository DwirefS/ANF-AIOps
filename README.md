# ANF‑AIOps

AI‑driven Management Control Plane for **Azure NetApp Files**.

```
.
├── mcp_server/        # FastAPI micro‑service
│   ├── routers/       # Accounts & Pools endpoints (more to come)
│   └── app.py
├── tests/             # Pytest unit tests (no live Azure hit)
├── infra/             # (placeholder) Terraform IaC
├── requirements.txt   # Runtime + dev deps
└── Dockerfile         # Container image
```

## Local quick‑start

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export MCP_API_KEY=changeme
export AZURE_SUBSCRIPTION_ID=dummy
export AZURE_RESOURCE_GROUP=dummy

pytest                # run unit tests
uvicorn mcp_server.app:app --reload
```
