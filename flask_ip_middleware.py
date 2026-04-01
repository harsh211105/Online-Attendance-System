from flask import Flask, request, abort
import os
import ipaddress
import logging

app = Flask(__name__)


def load_allowed_networks(env_var="ALLOWED_IP_RANGES"):
    """Load allowed CIDR ranges from an environment variable.

    The env var should be a comma-separated list of CIDRs, e.g.
    "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16".

    If the env var is not set, we fall back to sensible private-network defaults.
    """
    raw = os.getenv(env_var)
    if raw:
        parts = [p.strip() for p in raw.split(",") if p.strip()]
    else:
        parts = [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16",
            "127.0.0.1/32",
            "::1/128",
        ]

    networks = []
    for p in parts:
        try:
            networks.append(ipaddress.ip_network(p))
        except ValueError:
            # Skip invalid entries but log them for debugging
            app.logger.warning(f"Ignored invalid network entry in {env_var}: {p}")
    return networks


# Load allowed networks at import time; you can reload later if needed.
ALLOWED_NETWORKS = load_allowed_networks()

# Configure logging so blocked IPs are easy to see in console/logs
logging.basicConfig(level=logging.INFO)


@app.before_request
def restrict_by_ip():
    """Block requests whose client IP is not inside ALLOWED_NETWORKS.

    We try common headers (`X-Forwarded-For`, `X-Real-IP`) first because
    when using a tunnel/proxy (ngrok, reverse proxy) the immediate TCP
    source may be the proxy rather than the original client.

    If the IP is not in the allowed list, return HTTP 403.
    """
    # Prefer X-Forwarded-For (may contain a comma-separated list)
    xff = request.headers.get("X-Forwarded-For", "").strip()
    xri = request.headers.get("X-Real-IP", "").strip()

    if xff:
        client_ip = xff.split(",")[0].strip()
    elif xri:
        client_ip = xri
    else:
        client_ip = request.remote_addr or ""

    try:
        ip_obj = ipaddress.ip_address(client_ip)
    except ValueError:
        app.logger.warning(f"Blocked request with invalid IP: {client_ip}")
        abort(403)

    for net in ALLOWED_NETWORKS:
        if ip_obj in net:
            # Allowed — continue to the requested view
            return

    # Not allowed — log and abort
    app.logger.warning(f"Blocked IP: {client_ip} — not in allowed ranges")
    abort(403)


@app.route("/")
def index():
    return "Attendance system — allowed"


if __name__ == "__main__":
    # Run on all interfaces so the Pi is reachable from the local network.
    app.run(host="0.0.0.0", port=5000, debug=False)
