#!/usr/bin/env python3
"""
Test script for backup.py functionality.
This script tests the backup process without actually running mysqldump.
"""

import os
import sys
from pathlib import Path

# Add current directory to path to import backup module
sys.path.insert(0, str(Path(__file__).parent))

def test_backup_directory_creation():
    """Test backup directory creation."""
    print("Testing backup directory creation...")

    # Import backup functions
    from backup import create_backup_directory, setup_logging

    # Test directory creation
    backup_dir = "test_backups"
    backup_path = create_backup_directory(backup_dir)

    if backup_path.exists():
        print("✓ Backup directory created successfully")

        # Test logging setup
        logger = setup_logging(backup_dir)
        logger.info("Test log message")

        # Check if log file was created
        log_file = backup_path / "backup.log"
        if log_file.exists():
            print("✓ Logging setup successful")
        else:
            print("✗ Logging setup failed")

        # Cleanup test directory
        import shutil
        shutil.rmtree(backup_dir)
        print("✓ Test cleanup completed")

        return True
    else:
        print("✗ Backup directory creation failed")
        return False

def test_filename_generation():
    """Test backup filename generation."""
    print("\nTesting filename generation...")

    from backup import generate_backup_filename, is_weekly_backup

    # Test daily backup filename
    daily_filename = generate_backup_filename("test_db", False)
    print(f"Daily filename: {daily_filename}")

    # Test weekly backup filename
    weekly_filename = generate_backup_filename("test_db", True)
    print(f"Weekly filename: {weekly_filename}")

    # Test weekly detection
    is_weekly = is_weekly_backup()
    print(f"Is today Sunday (weekly backup day): {is_weekly}")

    print("✓ Filename generation test completed")
    return True

def test_cleanup_function():
    """Test cleanup function with dummy files."""
    print("\nTesting cleanup function...")

    from backup import cleanup_old_backups
    import tempfile
    import time

    # Create temporary directory with test files
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)

        # Create some dummy backup files
        for i in range(5):
            dummy_file = temp_path / f"backup_{i}.sql"
            dummy_file.write_text("dummy content")
            # Modify timestamp to simulate different ages
            time.sleep(0.1)

        # Test cleanup (keep only 2 files)
        removed_count, message = cleanup_old_backups(temp_path, 2)

        remaining_files = list(temp_path.glob("*.sql"))
        print(f"Files before cleanup: 5")
        print(f"Files after cleanup: {len(remaining_files)}")
        print(f"Files removed: {removed_count}")

        if len(remaining_files) == 2 and removed_count == 3:
            print("✓ Cleanup function working correctly")
            return True
        else:
            print("✗ Cleanup function failed")
            return False

def main():
    """Run all tests."""
    print("MySQL Backup Script - Test Suite")
    print("=" * 40)

    tests = [
        test_backup_directory_creation,
        test_filename_generation,
        test_cleanup_function
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"✗ Test failed with error: {e}")

    print("\n" + "=" * 40)
    print(f"Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("✓ All tests passed! Backup script is ready to use.")
        return True
    else:
        print("✗ Some tests failed. Please check the backup script.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
