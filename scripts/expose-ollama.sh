#!/bin/bash

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed."
    echo "👉 Install it via: brew install ngrok/ngrok/ngrok"
    echo "👉 Then authenticate: ngrok config add-authtoken <token>"
    exit 1
fi

echo "🚀 Exposing Local Ollama (Port 11434)..."
echo "⚠️  Ensure 'ollama serve' is running in another terminal!"
echo ""

# Start ngrok
ngrok http 11434 --host-header="localhost:11434"
