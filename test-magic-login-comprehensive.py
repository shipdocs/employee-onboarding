#!/usr/bin/env python3
"""
Comprehensive Magic Login Test Suite
Tests the complete magic login flow including API endpoints, database state, and security features
"""

import requests
import psycopg2
import json
import time
import secrets
import string
from datetime import datetime, timedelta
import sys
import traceback

# Configuration
BASE_URL = "http://localhost:3000/api"
DB_PARAMS = {
    "host": "localhost",
    "port": 5432,
    "database": "maritime",
    "user": "postgres",
    "password": "PostgresSecure123!"
}

class MagicLoginTester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.test_results = []
        
    def connect_db(self):
        """Establish database connection"""
        return psycopg2.connect(**DB_PARAMS)
    
    def print_header(self, text):
        """Print formatted header"""
        print(f"\n{'='*70}")
        print(f" {text}")
        print(f"{'='*70}")
    
    def print_subheader(self, text):
        """Print formatted subheader"""
        print(f"\n{'-'*50}")
        print(f" {text}")
        print(f"{'-'*50}")
    
    def record_test(self, name, passed, details="", error=None):
        """Record test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"\n[{status}] {name}")
        if details:
            print(f"       Details: {details}")
        if error:
            print(f"       Error: {error}")
        
        self.test_results.append({
            "name": name,
            "passed": passed,
            "details": details,
            "error": str(error) if error else None
        })
        
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def test_database_schema(self):
        """Test 1: Verify database schema is correct"""
        self.print_subheader("Test 1: Database Schema Verification")
        
        conn = self.connect_db()
        cursor = conn.cursor()
        
        try:
            # Check magic_links table structure
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'magic_links'
                ORDER BY ordinal_position
            """)
            
            columns = cursor.fetchall()
            required_columns = ['id', 'email', 'token', 'expires_at', 'created_at', 'used_at', 'used_ip']
            
            actual_columns = [col[0] for col in columns]
            print(f"Magic links table columns: {', '.join(actual_columns)}")
            
            missing = set(required_columns) - set(actual_columns)
            if missing:
                self.record_test("Magic links table schema", False, f"Missing columns: {missing}")
            else:
                self.record_test("Magic links table schema", True, "All required columns present")
            
            # Check users table
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'users'
            """)
            user_columns = [col[0] for col in cursor.fetchall()]
            
            required_user_cols = ['id', 'email', 'role', 'status', 'is_active']
            missing_user = set(required_user_cols) - set(user_columns)
            
            if missing_user:
                self.record_test("Users table schema", False, f"Missing columns: {missing_user}")
            else:
                self.record_test("Users table schema", True, "All required columns present")
                
        except Exception as e:
            self.record_test("Database schema check", False, error=e)
        finally:
            cursor.close()
            conn.close()
    
    def test_api_endpoint_availability(self):
        """Test 2: Check if API endpoints are accessible"""
        self.print_subheader("Test 2: API Endpoint Availability")
        
        endpoints = [
            ("/api/auth/request-magic-link", "POST"),
            ("/api/auth/magic-login", "POST")
        ]
        
        for endpoint, method in endpoints:
            url = f"http://localhost:3000{endpoint}"
            try:
                if method == "POST":
                    response = requests.post(url, json={}, timeout=5)
                else:
                    response = requests.get(url, timeout=5)
                
                # We expect 400/401 for empty requests, not 404 or 500
                if response.status_code == 404:
                    self.record_test(f"Endpoint {endpoint}", False, "Endpoint not found (404)")
                elif response.status_code >= 500:
                    self.record_test(f"Endpoint {endpoint}", False, f"Server error ({response.status_code})")
                else:
                    self.record_test(f"Endpoint {endpoint}", True, f"Accessible (status: {response.status_code})")
                    
            except requests.exceptions.ConnectionError:
                self.record_test(f"Endpoint {endpoint}", False, "Connection refused - is the server running?")
            except Exception as e:
                self.record_test(f"Endpoint {endpoint}", False, error=e)
    
    def test_request_magic_link_validation(self):
        """Test 3: Input validation for request-magic-link endpoint"""
        self.print_subheader("Test 3: Request Magic Link - Input Validation")
        
        test_cases = [
            ({"email": ""}, 400, "empty email"),
            ({"email": "invalid"}, 400, "invalid email format"),
            ({"email": "test@"}, 400, "incomplete email"),
            ({}, 400, "missing email field"),
            ({"email": "valid@example.com"}, [200, 403, 500], "valid email format")
        ]
        
        for payload, expected_status, description in test_cases:
            try:
                response = requests.post(
                    f"{BASE_URL}/auth/request-magic-link",
                    json=payload,
                    timeout=5
                )
                
                if isinstance(expected_status, list):
                    if response.status_code in expected_status:
                        self.record_test(f"Validation: {description}", True, 
                                       f"Got status {response.status_code}")
                    else:
                        self.record_test(f"Validation: {description}", False,
                                       f"Expected {expected_status}, got {response.status_code}")
                else:
                    if response.status_code == expected_status:
                        self.record_test(f"Validation: {description}", True)
                    else:
                        self.record_test(f"Validation: {description}", False,
                                       f"Expected {expected_status}, got {response.status_code}")
                        
            except Exception as e:
                self.record_test(f"Validation: {description}", False, error=e)
    
    def test_user_role_restrictions(self):
        """Test 4: Verify role-based access control"""
        self.print_subheader("Test 4: Role-Based Access Control")
        
        conn = self.connect_db()
        cursor = conn.cursor()
        
        try:
            # Get users by role
            cursor.execute("""
                SELECT email, role FROM users 
                WHERE is_active = true
                ORDER BY role
            """)
            
            users = cursor.fetchall()
            
            for email, role in users:
                response = requests.post(
                    f"{BASE_URL}/auth/request-magic-link",
                    json={"email": email},
                    timeout=5
                )
                
                response_data = response.json() if response.content else {}
                
                if role in ['admin', 'manager']:
                    # Should be blocked
                    if response.status_code == 403:
                        self.record_test(f"Block {role} ({email})", True, 
                                       "Correctly blocked privileged user")
                    elif response.status_code == 500:
                        self.record_test(f"Block {role} ({email})", False,
                                       "Got 500 error instead of 403")
                    else:
                        self.record_test(f"Block {role} ({email})", False,
                                       f"Should block but got {response.status_code}")
                elif role == 'crew':
                    # Should be allowed (or get generic success message)
                    if response.status_code in [200, 201]:
                        self.record_test(f"Allow {role} ({email})", True,
                                       "Crew member allowed")
                    elif response.status_code == 500:
                        self.record_test(f"Allow {role} ({email})", False,
                                       f"Server error: {response_data.get('error', 'Unknown')}")
                    else:
                        self.record_test(f"Allow {role} ({email})", False,
                                       f"Unexpected status {response.status_code}")
                        
        except Exception as e:
            self.record_test("Role restrictions", False, error=e)
        finally:
            cursor.close()
            conn.close()
    
    def test_magic_link_verification(self):
        """Test 5: Test magic link verification endpoint"""
        self.print_subheader("Test 5: Magic Link Verification")
        
        # Test with invalid token
        response = requests.post(
            f"{BASE_URL}/auth/magic-login",
            json={"token": "invalid-token-12345"},
            timeout=5
        )
        
        if response.status_code == 401:
            self.record_test("Reject invalid token", True, "Invalid token correctly rejected")
        else:
            self.record_test("Reject invalid token", False, 
                           f"Expected 401, got {response.status_code}")
        
        # Test with missing token
        response = requests.post(
            f"{BASE_URL}/auth/magic-login",
            json={},
            timeout=5
        )
        
        if response.status_code == 400:
            self.record_test("Reject missing token", True, "Missing token correctly rejected")
        else:
            self.record_test("Reject missing token", False,
                           f"Expected 400, got {response.status_code}")
    
    def test_rate_limiting(self):
        """Test 6: Verify rate limiting works"""
        self.print_subheader("Test 6: Rate Limiting")
        
        test_email = f"ratelimit-{int(time.time())}@test.com"
        
        # Make rapid requests
        triggered = False
        for i in range(10):
            response = requests.post(
                f"{BASE_URL}/auth/request-magic-link",
                json={"email": test_email},
                timeout=5
            )
            
            if response.status_code == 429:
                self.record_test("Rate limiting", True, 
                               f"Triggered after {i+1} requests")
                triggered = True
                break
            
            time.sleep(0.1)
        
        if not triggered:
            self.record_test("Rate limiting", False, 
                           "Rate limit not triggered after 10 requests")
    
    def test_database_operations(self):
        """Test 7: Direct database operations for magic links"""
        self.print_subheader("Test 7: Database Operations")
        
        conn = self.connect_db()
        cursor = conn.cursor()
        
        try:
            # Create a test magic link directly
            token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
            expires_at = datetime.now() + timedelta(hours=1)
            
            cursor.execute("""
                INSERT INTO magic_links (email, token, expires_at, created_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, ("test@example.com", token, expires_at, datetime.now()))
            
            magic_link_id = cursor.fetchone()[0]
            conn.commit()
            
            self.record_test("Create magic link in DB", True, f"Created link ID: {magic_link_id}")
            
            # Verify it exists
            cursor.execute("""
                SELECT COUNT(*) FROM magic_links WHERE token = %s
            """, (token,))
            
            count = cursor.fetchone()[0]
            if count == 1:
                self.record_test("Verify magic link exists", True)
            else:
                self.record_test("Verify magic link exists", False, f"Found {count} links")
            
            # Clean up
            cursor.execute("DELETE FROM magic_links WHERE token = %s", (token,))
            conn.commit()
            
        except Exception as e:
            self.record_test("Database operations", False, error=e)
            conn.rollback()
        finally:
            cursor.close()
            conn.close()
    
    def diagnose_issues(self):
        """Diagnose and report on issues found"""
        self.print_header("DIAGNOSIS")
        
        conn = self.connect_db()
        cursor = conn.cursor()
        
        try:
            # Check if Supabase tables exist
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('magic_links', 'users', 'security_events')
            """)
            
            table_count = cursor.fetchone()[0]
            print(f"\n📊 Database tables found: {table_count}/3")
            
            # Check for recent errors in logs
            print("\n📋 Recent backend logs (check Docker logs for details):")
            print("   Run: docker logs maritime_backend --tail 50")
            
            # Check environment variables
            print("\n🔧 Environment setup:")
            print("   - Database: PostgreSQL on localhost:5432")
            print("   - Backend: Node.js server on localhost:3000")
            print("   - Using custom Supabase compatibility layer")
            
            # Identify main issues
            print("\n⚠️  Identified Issues:")
            
            if any("500" in str(r.get("details", "")) for r in self.test_results):
                print("   1. Server returning 500 errors - likely Supabase compatibility issue")
                print("      The custom database-direct.js layer may not fully implement")
                print("      all Supabase methods used by request-magic-link.js")
            
            if any("role" in r["name"].lower() for r in self.test_results if not r["passed"]):
                print("   2. Role-based restrictions not working properly")
                print("      Admin/manager blocking may be failing due to API errors")
            
            print("\n💡 Recommendations:")
            print("   1. Check lib/database-direct.js Supabase compatibility implementation")
            print("   2. Review lib/supabase.js wrapper for missing methods")
            print("   3. Consider updating request-magic-link.js to use direct DB queries")
            print("   4. Check Docker logs for specific error messages")
            
        except Exception as e:
            print(f"\n❌ Diagnosis error: {e}")
        finally:
            cursor.close()
            conn.close()
    
    def run_all_tests(self):
        """Run all tests"""
        self.print_header("COMPREHENSIVE MAGIC LOGIN TEST SUITE")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"Target: {BASE_URL}")
        
        # Run tests
        self.test_database_schema()
        self.test_api_endpoint_availability()
        self.test_request_magic_link_validation()
        self.test_user_role_restrictions()
        self.test_magic_link_verification()
        self.test_rate_limiting()
        self.test_database_operations()
        
        # Diagnosis
        self.diagnose_issues()
        
        # Summary
        self.print_header("TEST SUMMARY")
        print(f"\n  Total Tests: {self.passed + self.failed}")
        print(f"  ✅ Passed: {self.passed}")
        print(f"  ❌ Failed: {self.failed}")
        
        if self.failed == 0:
            print("\n🎉 All tests passed!")
        else:
            print(f"\n⚠️  {self.failed} test(s) failed")
            print("\nFailed tests:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  - {result['name']}: {result['details']}")
        
        return 0 if self.failed == 0 else 1

if __name__ == "__main__":
    tester = MagicLoginTester()
    sys.exit(tester.run_all_tests())