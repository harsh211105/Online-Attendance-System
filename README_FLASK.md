Flask IP Restriction Middleware

Overview

This small helper adds a `before_request` middleware to a Flask app that
allows only requests coming from private/local IP ranges and returns HTTP
403 for others. It also logs blocked IP addresses to the console for debugging.

Files added

- `flask_ip_middleware.py` — example middleware and a tiny app.

Configuration

- `ALLOWED_IP_RANGES` environment variable: comma-separated CIDRs. If not set,
  the middleware uses these defaults:

  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
  - `127.0.0.1/32`
  - `::1/128`

Examples

PowerShell (set for current session):

```powershell
$env:ALLOWED_IP_RANGES = "192.168.0.0/16,10.0.0.0/8"
python flask_ip_middleware.py
```

Bash / Linux / macOS:

```bash
export ALLOWED_IP_RANGES="192.168.0.0/16,10.0.0.0/8"
python3 flask_ip_middleware.py
```

Notes about ngrok / proxies

- When you expose your Raspberry Pi with `ngrok`, the traffic is proxied.
  The TCP source (what `request.remote_addr` shows) will be the ngrok server
  or a local proxy, not the original client IP.
- The middleware first inspects `X-Forwarded-For` and `X-Real-IP` headers.
  Ngrok and many reverse proxies set these headers with the original client
  IP; if they are present the middleware uses them for the check.
- If the client IP in `X-Forwarded-For` is a public IP (not in local ranges),
  it will be blocked even if the request was received via ngrok — this meets
  the requirement to deny external/public addresses.

Testing

- From a device on the same mobile hotspot (same network range) you should
  be allowed and see the `Attendance system — allowed` response.
- From an external device (different network / public IP) you should receive
  HTTP 403 and the IP will be printed to console.

Next steps / suggestions

- If you want dynamic configuration, reload `ALLOWED_NETWORKS` from disk or
  an admin route instead of only at import time.
- Consider rate-limiting or authentication in addition to IP filtering for
  stronger protection.
