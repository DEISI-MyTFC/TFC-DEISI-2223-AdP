"""Development-only settings for the self-contained Codespaces stack."""

from .settings import *  # noqa: F403
from .settings import BASE_DIR, env

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "backend"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

codespace_name = env("CODESPACE_NAME", default="")
forwarding_domain = env("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", default="app.github.dev")
if codespace_name:
    for port in (5173, 8000):
        hostname = f"{codespace_name}-{port}.{forwarding_domain}"
        ALLOWED_HOSTS.append(hostname)
        CSRF_TRUSTED_ORIGINS.append(f"https://{hostname}")
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    JWT_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Read OTP messages in the Codespaces terminal; no SMTP account is needed.
EMAIL_BACKEND = "django.core.mail.backends.filebased.EmailBackend"
EMAIL_FILE_PATH = BASE_DIR / ".dev-emails"
