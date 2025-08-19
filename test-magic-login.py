#!/usr/bin/env python3
"""
Test script for Magic Login sequence
Tests both request and verification flows
"""

import requests
import json
import time
import sys
from datetime import datetime

# API endpoints
BASE_URL = "http://localhost:3000/api"
REQUEST_MAGIC_LINK_URL = f"{BASE_URL}/auth/request-magic-link"
VERIFY_MAGIC_LINK_URL = f"{BASE_URL}/auth/magic-login"

# Test configurations
TEST_CASES = [
    {
        "name": "Valid crew member email",
        "email": "john.doe@example.com",
        "should_succeed": True,
        "expected_message": "magic link has been sent"
    },
    {
        "name": "Admin email (should be blocked)",
        "email": "admin@maritime.com",
        "should_succeed": False,
        "expected_error": "Staff members must use"
    },
    {
        "name": "Manager email (should be blocked)",
        "email": "manager@maritime.com",
        "should_succeed": False,
        "expected_error": "Staff members must use"
    },
    {
        "name": "Non-existent email",
        "email": "nonexistent@example.com",
        "should_succeed": True,  # Should return generic success for security
        "expected_message": "If an account exists"
    },
    {
        "name": "Invalid email format",
        "email": "invalid-email",
        "should_succeed": False,
        "expected_error": "valid email address"
    }
]

def print_header(text):
    """Print formatted header"""
    print(f"\n{'='*60}")
    print(f" {text}")
    print(f"{'='*60}")

def print_test_result(test_name, success, details=""):
    """Print test result with formatting"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"\n[{status}] {test_name}")
    if details:
        print(f"       Details: {details}")

def test_request_magic_link(email):
    """Test requesting a magic link"""
    try:
        response = requests.post(
            REQUEST_MAGIC_LINK_URL,
            json={"email": email},
            headers={"Content-Type": "application/json"}
        )
        
        return {
            "status_code": response.status_code,
            "response": response.json() if response.content else {},
            "success": response.status_code in [200, 201]
        }
    except Exception as e:
        return {
            "status_code": None,
            "response": {"error": str(e)},
            "success": False
        }

def test_rate_limiting():
    """Test rate limiting for magic link requests"""
    print_header("Testing Rate Limiting")
    
    test_email = "ratelimit@test.com"
    attempts = 5
    
    print(f"Making {attempts} rapid requests with email: {test_email}")
    
    for i in range(attempts):
        result = test_request_magic_link(test_email)
        
        if result["status_code"] == 429:
            print_test_result(
                f"Rate limiting activated after {i} requests",
                True,
                result["response"].get("error", "Rate limited")
            )
            return True
        
        print(f"  Request {i+1}: Status {result['status_code']}")
        time.sleep(0.1)  # Small delay between requests
    
    print_test_result(
        "Rate limiting test",
        False,
        f"No rate limiting after {attempts} requests"
    )
    return False

def get_magic_token_from_db(email):
    """
    Attempt to retrieve magic token from database
    This would need direct database access in a real scenario
    """
    print("\n⚠️  Note: Direct database access needed to retrieve token")
    print("    In production, token would be sent via email")
    return None

def test_verify_magic_link(token):
    """Test verifying a magic link token"""
    try:
        response = requests.post(
            VERIFY_MAGIC_LINK_URL,
            json={"token": token},
            headers={"Content-Type": "application/json"}
        )
        
        return {
            "status_code": response.status_code,
            "response": response.json() if response.content else {},
            "success": response.status_code == 200
        }
    except Exception as e:
        return {
            "status_code": None,
            "response": {"error": str(e)},
            "success": False
        }

def main():
    """Main test execution"""
    print_header("MAGIC LOGIN TEST SUITE")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Target: {BASE_URL}")
    
    # Test 1: Request Magic Link for various scenarios
    print_header("Testing Magic Link Requests")
    
    passed_tests = 0
    failed_tests = 0
    
    for test_case in TEST_CASES:
        print(f"\nTesting: {test_case['name']}")
        print(f"  Email: {test_case['email']}")
        
        result = test_request_magic_link(test_case["email"])
        
        # Check if test passed based on expectations
        test_passed = False
        
        if test_case["should_succeed"]:
            if result["success"]:
                # Check for expected message in response
                response_text = json.dumps(result["response"]).lower()
                if test_case["expected_message"].lower() in response_text:
                    test_passed = True
                    details = f"Got expected message"
                else:
                    details = f"Unexpected response: {result['response']}"
            else:
                details = f"Request failed: {result['response']}"
        else:
            if not result["success"]:
                # Check for expected error
                response_text = json.dumps(result["response"]).lower()
                if test_case["expected_error"].lower() in response_text:
                    test_passed = True
                    details = f"Got expected error"
                else:
                    details = f"Unexpected error: {result['response']}"
            else:
                details = f"Request succeeded when it should have failed"
        
        print_test_result(test_case["name"], test_passed, details)
        
        if test_passed:
            passed_tests += 1
        else:
            failed_tests += 1
    
    # Test 2: Rate Limiting
    time.sleep(1)  # Wait before rate limit test
    if test_rate_limiting():
        passed_tests += 1
    else:
        failed_tests += 1
    
    # Test 3: Token Verification (if we had a token)
    print_header("Testing Magic Link Verification")
    
    print("\nTesting with invalid token:")
    invalid_result = test_verify_magic_link("invalid-token-12345")
    
    if invalid_result["status_code"] == 401:
        print_test_result(
            "Invalid token rejected",
            True,
            invalid_result["response"].get("message", "Token invalid")
        )
        passed_tests += 1
    else:
        print_test_result(
            "Invalid token test",
            False,
            f"Unexpected response: {invalid_result['response']}"
        )
        failed_tests += 1
    
    print("\nTesting with missing token:")
    empty_result = test_verify_magic_link("")
    
    if empty_result["status_code"] == 400:
        print_test_result(
            "Missing token rejected",
            True,
            empty_result["response"].get("message", "Token required")
        )
        passed_tests += 1
    else:
        print_test_result(
            "Missing token test",
            False,
            f"Unexpected response: {empty_result['response']}"
        )
        failed_tests += 1
    
    # Summary
    print_header("TEST SUMMARY")
    print(f"\n  Total Tests: {passed_tests + failed_tests}")
    print(f"  ✅ Passed: {passed_tests}")
    print(f"  ❌ Failed: {failed_tests}")
    
    if failed_tests == 0:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {failed_tests} test(s) failed")
    
    print("\n" + "="*60)
    
    return 0 if failed_tests == 0 else 1

if __name__ == "__main__":
    sys.exit(main())