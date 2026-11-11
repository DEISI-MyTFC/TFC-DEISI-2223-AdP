"""Verify Codespaces' localhost relays reach PostgreSQL and the frontend."""

import http.client
import socket
import struct
import time


with socket.create_connection(("127.0.0.1", 5432), timeout=5) as connection:
    # A PostgreSQL SSLRequest verifies the upstream protocol without credentials.
    connection.sendall(struct.pack("!II", 8, 80877103))
    if connection.recv(1) not in (b"N", b"S"):
        raise RuntimeError("Port 5432 did not reach PostgreSQL")
print("PostgreSQL is reachable through localhost:5432", flush=True)

deadline = time.monotonic() + 120
while True:
    connection = http.client.HTTPConnection("127.0.0.1", 5173, timeout=5)
    try:
        connection.request("GET", "/")
        if connection.getresponse().status == 200:
            print("Frontend is reachable through localhost:5173", flush=True)
            break
    except OSError:
        pass
    finally:
        connection.close()
    if time.monotonic() >= deadline:
        raise RuntimeError("Frontend did not become ready through localhost:5173")
    time.sleep(1)
