#!/usr/bin/env bash
# Setup script for the IDOINE project
# This script installs Node.js and Python dependencies and prepares a virtual environment.

set -e

# Check required commands
for cmd in node npm python; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "Error: $cmd is not installed." >&2
        exit 1
    fi
done

# Install global Node.js tools
npm install -g grunt-cli sass

# Install Node.js dependencies
npm install

# Create Python virtual environment if not present
if [ ! -d "venv" ]; then
    python -m venv venv
fi

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    . venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    . venv/Scripts/activate
fi

# Install Python dependencies
pip install -r requirements.txt

echo "Setup complete."
