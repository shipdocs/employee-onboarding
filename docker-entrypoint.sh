#!/bin/sh
# Docker entrypoint script for Employee Onboarding System Frontend

set -e

# Function to replace environment variables in built files
replace_env_vars() {
    echo "Replacing environment variables in built files..."
    
    # Replace API URL in built JavaScript files
    if [ -n "$REACT_APP_API_URL" ]; then
        find /usr/share/nginx/html/static/js -name "*.js" -exec sed -i "s|http://localhost:3000|$REACT_APP_API_URL|g" {} \;
        echo "Replaced API URL with: $REACT_APP_API_URL"
    fi
    
    # Replace other environment variables as needed
    if [ -n "$REACT_APP_SUPABASE_URL" ]; then
        find /usr/share/nginx/html/static/js -name "*.js" -exec sed -i "s|PLACEHOLDER_SUPABASE_URL|$REACT_APP_SUPABASE_URL|g" {} \;
        echo "Replaced Supabase URL with: $REACT_APP_SUPABASE_URL"
    fi
}

# Replace environment variables if they exist
replace_env_vars

# Start nginx
echo "Starting nginx..."
exec "$@"
