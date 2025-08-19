#!/usr/bin/env python3
import requests
import json

# Test login with special characters
url = "http://localhost:3000/api/auth/admin-login-fixed"
data = {
    "email": "admin@admin.com", 
    "password": "Password123!"
}

headers = {
    "Content-Type": "application/json"
}

print("Testing login with:")
print(json.dumps(data, indent=2))

try:
    response = requests.post(url, json=data, headers=headers)
    print(f"\nStatus Code: {response.status_code}")
    print("Response:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")