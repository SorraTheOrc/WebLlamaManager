#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="llama-manager"

# Load configuration from .env file
ENV_FILE="$SCRIPT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Loading configuration from .env"
    # Source .env file, expanding ~ to $HOME
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        # Remove leading/trailing whitespace
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        # Skip if no value
        [[ -z "$value" ]] && continue
        # Expand ~ to $HOME
        value="${value/#\~/$HOME}"
        # Export the variable
        export "$key=$value"
    done < "$ENV_FILE"
else
    echo "No .env file found, using defaults"
    echo "Copy .env.example to .env to customize configuration"
fi

# Set defaults if not defined
API_PORT="${API_PORT:-3001}"
LLAMA_PORT="${LLAMA_PORT:-8080}"
MODELS_DIR="${MODELS_DIR:-$HOME/models}"
MODELS_MAX="${MODELS_MAX:-2}"
CONTEXT_SIZE="${CONTEXT_SIZE:-8192}"
AUTO_START="${AUTO_START:-true}"

echo "=== Llama Manager Installation ==="
echo
echo "Configuration:"
echo "  API_PORT=$API_PORT"
echo "  LLAMA_PORT=$LLAMA_PORT"
echo "  MODELS_DIR=$MODELS_DIR"
echo "  MODELS_MAX=$MODELS_MAX"
echo "  CONTEXT_SIZE=$CONTEXT_SIZE"
echo "  AUTO_START=$AUTO_START"
echo

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check if service is already running
SERVICE_WAS_RUNNING=false
SERVICE_WAS_ENABLED=false

if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    SERVICE_WAS_RUNNING=true
    echo "[0/6] Stopping existing service..."
    systemctl --user stop "$SERVICE_NAME"
    echo "  Service stopped."
fi

if systemctl --user is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    SERVICE_WAS_ENABLED=true
fi

echo
echo "[1/6] Creating models directory..."
mkdir -p "$MODELS_DIR"
echo "  Models will be stored in: $MODELS_DIR"

echo
echo "[2/6] Installing API dependencies..."
cd "$SCRIPT_DIR/api"
npm install

echo
echo "[3/6] Installing UI dependencies and building..."
cd "$SCRIPT_DIR/ui"
npm install
npm run build

echo
echo "[4/6] Setting up systemd user service..."
mkdir -p ~/.config/systemd/user

# Generate service file with configured values
USER_ID=$(id -u)
USER_PATH=$(echo "$PATH")
cat > ~/.config/systemd/user/${SERVICE_NAME}.service << EOF
[Unit]
Description=Llama Manager API and Multi-Model Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$SCRIPT_DIR/api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

# Configuration
Environment=NODE_ENV=production
Environment=API_PORT=$API_PORT
Environment=LLAMA_PORT=$LLAMA_PORT
Environment=MODELS_DIR=$MODELS_DIR
Environment=MODELS_MAX=$MODELS_MAX
Environment=CONTEXT_SIZE=$CONTEXT_SIZE
Environment=AUTO_START=$AUTO_START

# Allow the service to manage distrobox containers
Environment=XDG_RUNTIME_DIR=/run/user/$USER_ID
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$USER_ID/bus
Environment=PATH=/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin
Environment=HOME=$HOME

[Install]
WantedBy=default.target
EOF

# Reload systemd
systemctl --user daemon-reload

echo
echo "[5/6] Restarting service..."

# Re-enable if it was enabled before
if [ "$SERVICE_WAS_ENABLED" = true ]; then
    systemctl --user enable "$SERVICE_NAME"
    echo "  Service enabled."
fi

# Restart if it was running before
if [ "$SERVICE_WAS_RUNNING" = true ]; then
    systemctl --user start "$SERVICE_NAME"
    echo "  Service started."

    # Wait a moment and check status
    sleep 2
    if systemctl --user is-active --quiet "$SERVICE_NAME"; then
        echo "  Service is running."
    else
        echo "  Warning: Service may have failed to start. Check logs:"
        echo "    journalctl --user -u $SERVICE_NAME -f"
    fi
else
    echo "  Service was not running before. Start manually with:"
    echo "    systemctl --user start $SERVICE_NAME"
fi

echo
echo "[6/6] Installation complete!"
echo

# Get IP address for network access
IP_ADDRESS=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk 'NR==1 {print $2}' | cut -d'/' -f1)

echo "=== Access ==="
echo "  Web UI:     http://localhost:$API_PORT"
echo "              http://${IP_ADDRESS}:$API_PORT"
echo "  Llama API:  http://localhost:$LLAMA_PORT"
echo "              http://${IP_ADDRESS}:$LLAMA_PORT"
echo

if [ "$SERVICE_WAS_RUNNING" = false ]; then
    echo "=== Next Steps ==="
    echo
    echo "1. Enable the service to start on boot:"
    echo "   systemctl --user enable $SERVICE_NAME"
    echo
    echo "2. Start the service now:"
    echo "   systemctl --user start $SERVICE_NAME"
    echo
    echo "3. Check service status:"
    echo "   systemctl --user status $SERVICE_NAME"
    echo
    echo "4. View logs:"
    echo "   journalctl --user -u $SERVICE_NAME -f"
    echo
    echo "To enable lingering (keep service running after logout):"
    echo "   sudo loginctl enable-linger $USER"
fi
