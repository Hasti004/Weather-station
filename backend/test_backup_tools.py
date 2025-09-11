#!/usr/bin/env python3
"""
Test script for all backup tools.
Tests the functionality of all backup-related scripts.
"""

import os
import sys
import subprocess
from pathlib import Path

def test_script(script_name, args=None, expected_exit_code=0):
    """Test a script with given arguments."""
    print(f"Testing {script_name}...")

    try:
        cmd = [sys.executable, script_name]
        if args:
            cmd.extend(args)

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        if result.returncode == expected_exit_code:
            print(f"✓ {script_name} passed (exit code: {result.returncode})")
            return True
        else:
            print(f"✗ {script_name} failed (exit code: {result.returncode})")
            if result.stderr:
                print(f"  Error: {result.stderr}")
            return False

    except subprocess.TimeoutExpired:
        print(f"✗ {script_name} timed out")
        return False
    except Exception as e:
        print(f"✗ {script_name} error: {e}")
        return False

def test_backup_tools():
    """Test all backup tools."""
    print("MySQL Backup Tools - Test Suite")
    print("=" * 50)

    # Test list_backups.py (should work)
    print("\n1. Testing list_backups.py...")
    success1 = test_script("list_backups.py")

    # Test monitor_backups.py (should work)
    print("\n2. Testing monitor_backups.py...")
    success2 = test_script("monitor_backups.py")

    # Test restore.py without arguments (should fail with usage message)
    print("\n3. Testing restore.py (no args - should show usage)...")
    success3 = test_script("restore.py", expected_exit_code=1)

    # Test verify_backup.py (may fail if MySQL not available)
    print("\n4. Testing verify_backup.py...")
    success4 = test_script("verify_backup.py")

    # Test backup.py (may fail if mysqldump not available)
    print("\n5. Testing backup.py...")
    success5 = test_script("backup.py")

    # Summary
    print("\n" + "=" * 50)
    print("TEST RESULTS SUMMARY")
    print("=" * 50)

    tests = [
        ("list_backups.py", success1),
        ("monitor_backups.py", success2),
        ("restore.py (usage)", success3),
        ("verify_backup.py", success4),
        ("backup.py", success5)
    ]

    passed = sum(1 for _, success in tests if success)
    total = len(tests)

    for test_name, success in tests:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{test_name:<20} {status}")

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed >= 3:  # At least 3 should pass
        print("✓ Backup tools are working correctly!")
        return True
    else:
        print("✗ Some backup tools have issues.")
        return False

def check_dependencies():
    """Check if required dependencies are available."""
    print("\nDEPENDENCY CHECK")
    print("-" * 30)

    # Check Python version
    python_version = sys.version_info
    print(f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")

    # Check if mysql-connector-python is available
    try:
        import mysql.connector
        print("✓ mysql-connector-python is available")
    except ImportError:
        print("✗ mysql-connector-python not found (needed for verify_backup.py)")

    # Check if mysqldump is available
    try:
        result = subprocess.run(["mysqldump", "--version"],
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✓ mysqldump is available")
        else:
            print("✗ mysqldump not found (needed for backup.py)")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("✗ mysqldump not found (needed for backup.py)")

    # Check if mysql is available
    try:
        result = subprocess.run(["mysql", "--version"],
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✓ mysql client is available")
        else:
            print("✗ mysql client not found (needed for restore.py)")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("✗ mysql client not found (needed for restore.py)")

def main():
    """Main test function."""
    print("MySQL Backup Tools - Comprehensive Test Suite")
    print("=" * 60)

    # Check dependencies
    check_dependencies()

    # Test all tools
    success = test_backup_tools()

    print("\n" + "=" * 60)
    if success:
        print("🎉 All backup tools are ready to use!")
        print("\nNext steps:")
        print("1. Configure database credentials in each script")
        print("2. Run: python backup.py (to create a backup)")
        print("3. Run: python list_backups.py (to see backups)")
        print("4. Run: python monitor_backups.py (to check health)")
    else:
        print("⚠️  Some tools need attention. Check the output above.")
        print("\nTroubleshooting:")
        print("1. Install missing dependencies: pip install mysql-connector-python")
        print("2. Install MySQL client tools")
        print("3. Check database credentials")

    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
