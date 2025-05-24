# ANF-AIOps

**Azure NetApp Files AI Operations (ANF‑AIOps)**

This project provides a production‑grade Management Control Plane (MCP) micro‑service, Terraform IaC, and starter AI/Logic‑App workflows for automating Azure NetApp Files.

```
mcp_server/    # FastAPI code
tests/         # pytest unit tests
infra/         # Terraform module (container app, identity, role)
```

## Quick local run

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export MCP_API_KEY=changeme
export AZURE_SUBSCRIPTION_ID=dummy
export AZURE_RESOURCE_GROUP=dummy
uvicorn mcp_server.app:app --reload
```

Run tests:

```bash
pytest
```

