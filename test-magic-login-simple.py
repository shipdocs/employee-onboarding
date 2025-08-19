#!/usr/bin/env python3
"""
Simple Magic Login test using actual database users
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:3000/api"

def test_magic_link_request(email):
    """Request a magic link"""
    url = f"{BASE_URL}/auth/request-magic-link"
    response = requests.post(url, json={"email": email})
    return response.status_code, response.json()

def test_magic_link_verify(token):
    """Verify a magic link"""
    url = f"{BASE_URL}/auth/magic-login"
    response = requests.post(url, json={"token": token})
    return response.status_code, response.json()

print("\n" + "="*60)
print(" MAGIC LOGIN TEST - SIMPLE")
print("="*60)

# Test 1: Valid crew member
print("\n1. Testing valid crew member (crew1@maritime-onboarding.local):")
status, response = test_magic_link_request("crew1@maritime-onboarding.local")
print(f"   Status: {status}")
print(f"   Response: {json.dumps(response, indent=2)}")

time.sleep(2)  # Wait to avoid rate limiting

# Test 2: Admin (should be blocked)
print("\n2. Testing admin (should be blocked):")
status, response = test_magic_link_request("admin@maritime-onboarding.local")
print(f"   Status: {status}")
print(f"   Response: {json.dumps(response, indent=2)}")

time.sleep(2)

# Test 3: Manager (should be blocked)
print("\n3. Testing manager (should be blocked):")
status, response = test_magic_link_request("manager1@maritime-onboarding.local")
print(f"   Status: {status}")
print(f"   Response: {json.dumps(response, indent=2)}")

time.sleep(2)

# Test 4: Non-existent user
print("\n4. Testing non-existent user:")
status, response = test_magic_link_request("nonexistent@example.com")
print(f"   Status: {status}")
print(f"   Response: {json.dumps(response, indent=2)}")

# Test 5: Invalid token verification
print("\n5. Testing invalid token verification:")
status, response = test_magic_link_verify("invalid-token-12345")
print(f"   Status: {status}")
print(f"   Response: {json.dumps(response, indent=2)}")

print("\n" + "="*60)
print(" If crew1 test returns success, check email or database for the magic link token")
print("="*60)