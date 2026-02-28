# Share route — generate shareable links for visualizations
# Zero-cost sharing via unique IDs stored in-memory (Turso for production)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uuid
import hashlib
import json
import zlib
import base64
from datetime import datetime

router = APIRouter()

# In-memory store — production uses Turso/SQLite
_share_store: Dict[str, Dict[str, Any]] = {}


class ShareRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=500_000)
    title: Optional[str] = Field(default="Untitled Visualization")
    description: Optional[str] = Field(default="")
    adapter_hint: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class ShareResponse(BaseModel):
    share_id: str
    share_url: str
    created_at: str
    expires_in: str


def _compress_code(code: str) -> str:
    """Compress code for compact storage."""
    compressed = zlib.compress(code.encode('utf-8'), level=9)
    return base64.urlsafe_b64encode(compressed).decode('ascii')


def _decompress_code(compressed: str) -> str:
    """Decompress stored code."""
    data = base64.urlsafe_b64decode(compressed.encode('ascii'))
    return zlib.decompress(data).decode('utf-8')


def _generate_share_id(code: str) -> str:
    """
    Generate a deterministic short ID based on code content.
    Same code = same share link. Genius or lazy? Yes.
    """
    code_hash = hashlib.sha256(code.encode('utf-8')).hexdigest()
    return code_hash[:10]


@router.post("/share", response_model=ShareResponse)
async def create_share_link(request: ShareRequest):
    """
    Create a shareable link for a code visualization.
    Same code produces the same link (content-addressed).
    """
    share_id = _generate_share_id(request.code)
    now = datetime.utcnow().isoformat()

    # Store compressed code to save memory
    stored = {
        'share_id': share_id,
        'title': request.title,
        'description': request.description or '',
        'code_compressed': _compress_code(request.code),
        'adapter_hint': request.adapter_hint,
        'config': request.config or {},
        'created_at': now,
        'view_count': 0,
    }
    _share_store[share_id] = stored

    return ShareResponse(
        share_id=share_id,
        share_url=f"/shared/{share_id}",
        created_at=now,
        expires_in="7 days (free tier)",
    )


@router.get("/share/{share_id}")
async def get_shared_visualization(share_id: str):
    """Load a shared visualization by its ID."""
    if share_id not in _share_store:
        raise HTTPException(status_code=404, detail=f"Shared visualization '{share_id}' not found or expired")

    stored = _share_store[share_id]
    stored['view_count'] = stored.get('view_count', 0) + 1

    return {
        'share_id': stored['share_id'],
        'title': stored['title'],
        'description': stored['description'],
        'code': _decompress_code(stored['code_compressed']),
        'adapter_hint': stored['adapter_hint'],
        'config': stored['config'],
        'created_at': stored['created_at'],
        'view_count': stored['view_count'],
    }


@router.get("/share/{share_id}/embed")
async def get_embed_config(share_id: str):
    """
    Get embeddable configuration for iframe embedding.
    Because every blog post needs a live code visualization.
    """
    if share_id not in _share_store:
        raise HTTPException(status_code=404, detail="Not found")

    stored = _share_store[share_id]
    return {
        'share_id': share_id,
        'title': stored['title'],
        'code': _decompress_code(stored['code_compressed']),
        'embed_url': f"/embed/{share_id}",
        'iframe_html': f'<iframe src="/embed/{share_id}" width="800" height="600" frameborder="0"></iframe>',
    }
