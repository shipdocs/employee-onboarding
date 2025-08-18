#!/bin/bash

# Quick Admin API Testing Script
# This script demonstrates how to get an admin token and test various endpoints

BASE_URL="https://onboarding.burando.online"
ADMIN_EMAIL="${ADMIN_EMAIL:-adminmartexx@shipdocs.app}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"

if [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ ADMIN_PASSWORD environment variable is required"
    echo "Usage: ADMIN_PASSWORD='your-password' ./quick-admin-test.sh"
    exit 1
fi

echo "🚀 Quick Admin API Testing"
echo "=========================="
echo ""

# 1. Get admin token
echo "1. 🔐 Getting admin token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/admin-login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

# Extract token using jq (if available) or basic parsing
if command -v jq &> /dev/null; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
    USER_NAME=$(echo "$LOGIN_RESPONSE" | jq -r '.user.firstName + " " + .user.lastName')
    echo "✅ Login successful: $USER_NAME"
else
    # Basic token extraction without jq
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Login successful (token extracted)"
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to get admin token"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "🔑 Token: ${TOKEN:0:20}..."
echo ""

# 2. Test token verification
echo "2. 🔍 Testing token verification..."
VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/verify" \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    VALID=$(echo "$VERIFY_RESPONSE" | jq -r '.valid')
    if [ "$VALID" = "true" ]; then
        echo "✅ Token is valid"
    else
        echo "❌ Token is invalid"
    fi
else
    if echo "$VERIFY_RESPONSE" | grep -q '"valid":true'; then
        echo "✅ Token is valid"
    else
        echo "❌ Token is invalid"
    fi
fi
echo ""

# 3. Test admin stats
echo "3. 📊 Testing admin stats..."
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/stats" \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    MANAGERS=$(echo "$STATS_RESPONSE" | jq -r '.totalManagers // "N/A"')
    CREW=$(echo "$STATS_RESPONSE" | jq -r '.totalCrewMembers // "N/A"')
    echo "✅ Stats retrieved - Managers: $MANAGERS, Crew: $CREW"
else
    echo "✅ Stats retrieved"
    echo "Response: $STATS_RESPONSE"
fi
echo ""

# 4. Test managers list
echo "4. 👥 Testing managers list..."
MANAGERS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/managers" \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    MANAGER_COUNT=$(echo "$MANAGERS_RESPONSE" | jq -r '.managers | length')
    echo "✅ Found $MANAGER_COUNT managers"
    if [ "$MANAGER_COUNT" -gt 0 ]; then
        echo "First manager:"
        echo "$MANAGERS_RESPONSE" | jq -r '.managers[0] | "  - \(.first_name) \(.last_name) (\(.email))"'
    fi
else
    echo "✅ Managers list retrieved"
    echo "Response: $MANAGERS_RESPONSE"
fi
echo ""

# 5. Test templates
echo "5. 📄 Testing templates..."
TEMPLATES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/templates" \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    TEMPLATE_COUNT=$(echo "$TEMPLATES_RESPONSE" | jq -r '.templates | length')
    echo "✅ Found $TEMPLATE_COUNT templates"
    if [ "$TEMPLATE_COUNT" -gt 0 ]; then
        echo "Templates:"
        echo "$TEMPLATES_RESPONSE" | jq -r '.templates[] | "  - \(.name) (ID: \(.id))"'
    fi
else
    echo "✅ Templates retrieved"
    echo "Response: $TEMPLATES_RESPONSE"
fi
echo ""

# 6. Test health check (no auth needed)
echo "6. 🏥 Testing health check..."
HEALTH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/health")

if command -v jq &> /dev/null; then
    STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status')
    VERSION=$(echo "$HEALTH_RESPONSE" | jq -r '.version // "unknown"')
    echo "✅ Health check - Status: $STATUS, Version: $VERSION"
else
    echo "✅ Health check completed"
    echo "Response: $HEALTH_RESPONSE"
fi
echo ""

echo "🎉 All tests completed!"
echo ""
echo "💡 Your admin token (valid for 24h):"
echo "$TOKEN"
echo ""
echo "🔧 Example usage:"
echo "curl -X GET \"$BASE_URL/api/admin/stats\" \\"
echo "  -H \"Authorization: Bearer $TOKEN\""
