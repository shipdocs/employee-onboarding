#!/bin/bash

# Fix incorrect rateLimit import paths in API files
echo "Fixing rateLimit import paths in API files..."

# Find all JS files in api directory and fix the import path
find api -name "*.js" -type f | while read -r file; do
    # Check if file contains the incorrect import
    if grep -q "require('../../lib/rateLimit')" "$file"; then
        # Get the directory depth relative to api/
        depth=$(echo "$file" | tr '/' '\n' | grep -c .)
        
        # api/ is at depth 1, so we need to calculate relative path
        # Files directly in api/ don't need fixing
        # Files in api/subdir/ need ../../../lib/rateLimit
        # Files in api/subdir/subdir2/ need ../../../../lib/rateLimit
        
        # Replace the incorrect path with the correct one
        sed -i "s|require('../../lib/rateLimit')|require('../../../lib/rateLimit')|g" "$file"
        echo "Fixed: $file"
    fi
done

echo "Done! All rateLimit imports have been fixed."