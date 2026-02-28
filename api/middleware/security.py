# Security Headers Middleware — defense in depth for the web frontend
# CSP, HSTS, X-Frame-Options, and friends
# Because security is not optional, even for a free app

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all responses.

    Headers applied:
    - Content-Security-Policy: Restrict resource loading
    - X-Content-Type-Options: Prevent MIME sniffing
    - X-Frame-Options: Prevent clickjacking
    - X-XSS-Protection: Enable browser XSS filter
    - Referrer-Policy: Control referrer information
    - Permissions-Policy: Restrict browser features

    These headers cost nothing but protect everything.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Content Security Policy
        # Allow self, inline styles (styled-components), and CDN assets
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # React needs these
            "style-src 'self' 'unsafe-inline'",                  # styled-components
            "img-src 'self' data: https:",                        # Data URIs for icons
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://api.groq.com https://api-inference.huggingface.co",  # AI APIs
            "frame-ancestors 'self'",                             # Allow self-embedding only
            "base-uri 'self'",
            "form-action 'self'",
        ]
        response.headers['Content-Security-Policy'] = '; '.join(csp_directives)

        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'

        # XSS Protection (legacy browsers)
        response.headers['X-XSS-Protection'] = '1; mode=block'

        # Referrer Policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Permissions Policy — disable unnecessary browser features
        response.headers['Permissions-Policy'] = (
            'camera=(), microphone=(), geolocation=(), '
            'payment=(), usb=(), magnetometer=(), gyroscope=()'
        )

        # Remove server identification
        if 'server' in response.headers:
            del response.headers['server']

        return response
