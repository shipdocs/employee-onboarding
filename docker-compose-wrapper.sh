#!/bin/bash

# Docker Compose wrapper script to handle the Python dependency issue
# This script uses the modern 'docker compose' command instead of legacy 'docker-compose'

# Check if docker compose v2 is available
if docker compose version &>/dev/null; then
    # Use modern docker compose command
    docker compose "$@"
else
    # Fall back to docker-compose if v2 is not available
    echo "Warning: Using legacy docker-compose. Consider upgrading to Docker Compose v2."
    docker-compose "$@"
fi