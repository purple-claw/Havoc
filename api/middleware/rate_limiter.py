# Rate Limiter Middleware — protect the free tier from abuse
# Uses in-memory token bucket algorithm (no Redis required = $0)

import time
import asyncio
from collections import defaultdict
from typing import Dict, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class TokenBucket:
    """
    Token bucket rate limiter.
    Tokens refill at a steady rate. Each request costs one token.
    When the bucket is empty, requests are denied.
    """

    def __init__(self, max_tokens: int, refill_rate: float):
        """
        max_tokens: Maximum burst size
        refill_rate: Tokens added per second
        """
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate
        self.tokens = max_tokens
        self.last_refill = time.time()

    def consume(self) -> bool:
        """Try to consume one token. Returns True if allowed."""
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(
            self.max_tokens,
            self.tokens + elapsed * self.refill_rate
        )
        self.last_refill = now

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

    @property
    def retry_after(self) -> float:
        """Seconds until next token is available."""
        if self.tokens >= 1:
            return 0
        return (1 - self.tokens) / self.refill_rate


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Per-IP rate limiting middleware.

    Limits:
    - /api/execute: 30 requests/minute (code execution is expensive)
    - /api/share: 20 requests/minute
    - /api/snippets: 60 requests/minute
    - Everything else: 120 requests/minute

    Why per-IP? Because it's free, simple, and works.
    Production can add API keys + Redis when revenue arrives.
    """

    # Route-specific limits: (max_tokens, refill_rate_per_second)
    ROUTE_LIMITS = {
        '/api/execute': (30, 0.5),        # 30 burst, 0.5/sec = 30/min
        '/api/execute/quick': (60, 1.0),   # Preview is lighter
        '/api/share': (20, 0.33),          # 20 burst, 20/min
        '/api/snippets': (60, 1.0),        # 60/min
    }
    DEFAULT_LIMIT = (120, 2.0)  # 120 burst, 120/min

    def __init__(self, app, **kwargs):
        super().__init__(app, **kwargs)
        # IP -> route_prefix -> TokenBucket
        self._buckets: Dict[str, Dict[str, TokenBucket]] = defaultdict(dict)
        self._cleanup_counter = 0
        self._cleanup_interval = 1000  # Clean up stale entries every N requests

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP, handling proxies."""
        # Check X-Forwarded-For (behind reverse proxy like Render/Vercel)
        forwarded = request.headers.get('x-forwarded-for')
        if forwarded:
            return forwarded.split(',')[0].strip()
        # Check X-Real-IP
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        # Direct connection
        if request.client:
            return request.client.host
        return '0.0.0.0'

    def _get_route_limit(self, path: str) -> Tuple[int, float]:
        """Get rate limit for the request path."""
        for route_prefix, limits in self.ROUTE_LIMITS.items():
            if path.startswith(route_prefix):
                return limits
        return self.DEFAULT_LIMIT

    def _get_bucket(self, ip: str, path: str) -> TokenBucket:
        """Get or create a token bucket for this IP + route combo."""
        max_tokens, refill_rate = self._get_route_limit(path)
        route_key = path.split('?')[0]  # Ignore query params

        # Find matching route prefix for bucketing
        bucket_key = 'default'
        for route_prefix in self.ROUTE_LIMITS:
            if route_key.startswith(route_prefix):
                bucket_key = route_prefix
                break

        if bucket_key not in self._buckets[ip]:
            self._buckets[ip][bucket_key] = TokenBucket(max_tokens, refill_rate)

        return self._buckets[ip][bucket_key]

    def _cleanup_stale(self):
        """Remove stale entries to prevent memory growth."""
        now = time.time()
        stale_ips = []
        for ip, buckets in self._buckets.items():
            all_stale = all(
                (now - b.last_refill) > 300  # 5 minutes idle
                for b in buckets.values()
            )
            if all_stale:
                stale_ips.append(ip)

        for ip in stale_ips:
            del self._buckets[ip]

    async def dispatch(self, request: Request, call_next):
        """Rate limit check on every request."""
        # Skip rate limiting for health checks and static assets
        path = request.url.path
        if path in ('/health', '/ready', '/favicon.ico') or path.startswith('/static'):
            return await call_next(request)

        # Periodic cleanup
        self._cleanup_counter += 1
        if self._cleanup_counter >= self._cleanup_interval:
            self._cleanup_counter = 0
            self._cleanup_stale()

        # Get client info and check rate limit
        client_ip = self._get_client_ip(request)
        bucket = self._get_bucket(client_ip, path)

        if not bucket.consume():
            retry_after = round(bucket.retry_after, 1)
            return JSONResponse(
                status_code=429,
                content={
                    'error': 'Rate limit exceeded',
                    'message': (
                        f"Whoa there, speed demon! You've hit the rate limit. "
                        f"Try again in {retry_after} seconds. "
                        f"HAVOC is free, but not infinitely fast."
                    ),
                    'retry_after': retry_after,
                },
                headers={
                    'Retry-After': str(int(retry_after) + 1),
                    'X-RateLimit-Limit': str(bucket.max_tokens),
                    'X-RateLimit-Remaining': str(max(0, int(bucket.tokens))),
                }
            )

        # Add rate limit headers to response
        response = await call_next(request)
        response.headers['X-RateLimit-Limit'] = str(bucket.max_tokens)
        response.headers['X-RateLimit-Remaining'] = str(max(0, int(bucket.tokens)))

        return response
