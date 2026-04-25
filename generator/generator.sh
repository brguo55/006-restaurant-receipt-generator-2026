#!/bin/bash

cd "$(dirname "$0")"

URL="http://localhost:8000/generator.html"

echo "Starting Restaurant Receipt Generator..."
echo "Opening: $URL"

# Open browser on macOS or Linux
if command -v open >/dev/null 2>&1; then
    open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
else
    echo "Could not open browser automatically."
    echo "Please open this URL manually: $URL"
fi

# Start local server
if command -v python3 >/dev/null 2>&1; then
    python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
    python -m http.server 8000
else
    echo "Python is not installed or not found."
    echo "Please install Python first."
    exit 1
fi