# The FastAPI app — the central nervous system connecting everything
# CORS, routes, middleware, and the health check that proves we're alive

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import execute, snippets, share
from api.middleware.rate_limiter import RateLimitMiddleware
from api.middleware.security import SecurityHeadersMiddleware

# Create the app — this is where the magic begins
app = FastAPI(
    title="HAVOC API",
    description="Hypnotic Algorithm Visualization Of Code — the API that makes code dance",
    version="2.0.0",
    docs_url="/api/docs",       # Swagger UI for the curious
    redoc_url="/api/redoc",     # ReDoc for the fancy
)

# CORS — let the frontend talk to us without the browser throwing a tantrum
ALLOWED_ORIGINS = os.getenv("HAVOC_CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers — because enterprise grade means enterprise security
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting — stop the script kiddies from DDoS-ing our free tier
app.add_middleware(RateLimitMiddleware)

# Register route groups
app.include_router(execute.router, prefix="/api", tags=["Execution"])
app.include_router(snippets.router, prefix="/api", tags=["Snippets"])
app.include_router(share.router, prefix="/api", tags=["Sharing"])


@app.get("/", tags=["Health"])
async def root():
    """Health check — proof that the server is alive and kicking."""
    return {
        "status": "alive",
        "service": "HAVOC API",
        "version": "2.0.0",
        "message": "Hypnotic Algorithm Visualization Of Code — ready to make your code dance",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Detailed health check with system info."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "adapters": _get_adapter_count(),
        "features": {
            "execution_tracing": True,
            "ai_explanations": True,
            "code_sharing": True,
            "multi_adapter": True,
        },
    }


@app.get("/api/adapters", tags=["Info"])
async def list_adapters():
    """List all available visualization adapters."""
    from calcharo.adapters import AdapterRegistry
    return {"adapters": AdapterRegistry.get_adapter_info()}


def _get_adapter_count() -> int:
    from calcharo.adapters.registry import ADAPTER_PRIORITY
    return len(ADAPTER_PRIORITY)
