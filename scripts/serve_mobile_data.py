#!/usr/bin/env python3
"""
Simple HTTP server to serve data files for React Native development.
This serves the artifacts directory so the mobile app can fetch JSON files.
"""

import http.server
import socketserver
import os
from pathlib import Path

# Configuration
PORT = 8080
ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler with CORS enabled for React Native."""

    def end_headers(self):
        # Enable CORS for all origins
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def main():
    # Change to artifacts directory
    os.chdir(ARTIFACTS_DIR)

    print("=" * 60)
    print("Mobile Data Server")
    print("=" * 60)
    print(f"Serving files from: {ARTIFACTS_DIR}")
    print(f"Server running at: http://localhost:{PORT}")
    print()
    print("Available files:")
    for file in sorted(ARTIFACTS_DIR.glob("*.json")):
        size_mb = file.stat().st_size / (1024 * 1024)
        print(f"  • {file.name} ({size_mb:.2f} MB)")
    print()
    print("In your mobile app, files will be accessible at:")
    print(f"  http://localhost:{PORT}/embedding.json")
    print(f"  http://localhost:{PORT}/clusters.json")
    print(f"  http://localhost:{PORT}/metadata.json")
    print(f"  http://localhost:{PORT}/cluster_metadata.json")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    print()

    # Start server
    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nShutting down server...")
            httpd.shutdown()

if __name__ == "__main__":
    main()
