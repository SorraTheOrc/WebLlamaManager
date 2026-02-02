#!/bin/bash
set -euo pipefail

# Wrapper script to start llama.cpp in multi-model router mode inside the distrobox container

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_NAME="llama-rocm-7rc-rocwmma"

# Pass through environment variables (from systemd service or .env)
export MODELS_DIR="${MODELS_DIR:-$HOME/models}"
export MODELS_MAX="${MODELS_MAX:-2}"
export CONTEXT="${CONTEXT_SIZE:-${CONTEXT:-8192}}"
export PORT="${LLAMA_PORT:-${PORT:-8080}}"

echo "Starting llama.cpp in distrobox container: $CONTAINER_NAME"
echo "Models directory: $MODELS_DIR"

# Ensure models directory exists on host
mkdir -p "$MODELS_DIR"

# Use full path to distrobox
DISTROBOX="/usr/local/bin/distrobox"
if [ ! -x "$DISTROBOX" ]; then
    DISTROBOX=$(which distrobox 2>/dev/null || echo "distrobox")
fi

# Check if distrobox container exists
CONTAINER_LIST=$($DISTROBOX list 2>&1)
if ! echo "$CONTAINER_LIST" | grep -E "\\|[[:space:]]*${CONTAINER_NAME}[[:space:]]*\\|" > /dev/null; then
    echo "Error: Distrobox container '$CONTAINER_NAME' not found"
    echo "Available containers:"
    echo "$CONTAINER_LIST"
    exit 1
fi

# Enter the container and run the start script
exec $DISTROBOX enter "$CONTAINER_NAME" -- bash -c "
    export MODELS_DIR='$MODELS_DIR'
    export MODELS_MAX='$MODELS_MAX'
    export CONTEXT='$CONTEXT'
    export PORT='$PORT'
    cd '$SCRIPT_DIR' && ./container-start.sh
"
