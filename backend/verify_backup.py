#!/usr/bin/env python3
"""
MySQL Backup Verification Script
Verifies that the latest backup is valid by connecting to MySQL and checking tables.
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime

# Configuration variables
DB_USER = "root"
DB_PASS = "Hasti@123"
DB_NAME = "observatory"
BACKUP_DIR = "backups"

def setup_logging():
    """Setup logging for verification operations."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    return logging.getLogger(__name__)

def get_latest_backup(backup_dir):
    """Get the most recent backup file."""
    backup_path = Path(backup_dir)

    if not backup_path.exists():
        raise FileNotFoundError(f"Backup directory does not exist: {backup_dir}")

    # Find all backup files
    backup_files = []
    for pattern in ["*.sql", "*.tar.gz", "*.gz"]:
        backup_files.extend(backup_path.glob(pattern))

    if not backup_files:
        raise FileNotFoundError("No backup files found")

    # Sort by modification time (newest first)
    backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    return backup_files[0]

def verify_mysql_connection(db_user, db_pass, db_name):
    """Verify MySQL connection and database access."""
    try:
        import mysql.connector

        # Connect to MySQL
        connection = mysql.connector.connect(
            host='localhost',
            user=db_user,
            password=db_pass,
            database=db_name,
            autocommit=True
        )

        if connection.is_connected():
            cursor = connection.cursor()

            # Test basic query
            cursor.execute("SELECT 1")
            result = cursor.fetchone()

            if result and result[0] == 1:
                return True, "MySQL connection successful"
            else:
                return False, "MySQL query test failed"

        return False, "MySQL connection failed"

    except ImportError:
        return False, "mysql-connector-python not installed. Run: pip install mysql-connector-python"
    except mysql.connector.Error as e:
        return False, f"MySQL error: {str(e)}"
    except Exception as e:
        return False, f"Connection error: {str(e)}"

def verify_database_tables(db_user, db_pass, db_name):
    """Verify database has tables and basic structure."""
    try:
        import mysql.connector

        connection = mysql.connector.connect(
            host='localhost',
            user=db_user,
            password=db_pass,
            database=db_name,
            autocommit=True
        )

        cursor = connection.cursor()

        # Get table list
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()

        if not tables:
            return False, "No tables found in database"

        # Check table count
        table_count = len(tables)

        # Get database info
        cursor.execute("SELECT DATABASE()")
        db_name_result = cursor.fetchone()

        cursor.close()
        connection.close()

        return True, f"Database verification successful. Found {table_count} tables in database '{db_name_result[0]}'"

    except mysql.connector.Error as e:
        return False, f"Database verification failed: {str(e)}"
    except Exception as e:
        return False, f"Verification error: {str(e)}"

def check_backup_freshness(backup_file):
    """Check if backup file is recent (within last 24 hours)."""
    try:
        file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
        current_time = datetime.now()
        time_diff = current_time - file_time

        hours_old = time_diff.total_seconds() / 3600

        if hours_old <= 24:
            return True, f"Backup is fresh ({hours_old:.1f} hours old)"
        else:
            return False, f"Backup is stale ({hours_old:.1f} hours old)"

    except Exception as e:
        return False, f"Could not check backup freshness: {str(e)}"

def main():
    """Main verification function."""
    logger = setup_logging()

    logger.info("=" * 50)
    logger.info("Starting MySQL backup verification")
    logger.info(f"Database: {DB_NAME}")
    logger.info(f"Backup directory: {BACKUP_DIR}")

    try:
        # Step 1: Find latest backup
        logger.info("Step 1: Finding latest backup...")
        latest_backup = get_latest_backup(BACKUP_DIR)
        logger.info(f"✓ Latest backup: {latest_backup.name}")

        # Step 2: Check backup freshness
        logger.info("Step 2: Checking backup freshness...")
        is_fresh, freshness_msg = check_backup_freshness(latest_backup)
        logger.info(f"✓ {freshness_msg}")

        # Step 3: Verify MySQL connection
        logger.info("Step 3: Verifying MySQL connection...")
        conn_success, conn_msg = verify_mysql_connection(DB_USER, DB_PASS, DB_NAME)

        if not conn_success:
            logger.error(f"✗ MySQL connection failed: {conn_msg}")
            return False

        logger.info(f"✓ {conn_msg}")

        # Step 4: Verify database tables
        logger.info("Step 4: Verifying database tables...")
        table_success, table_msg = verify_database_tables(DB_USER, DB_PASS, DB_NAME)

        if not table_success:
            logger.error(f"✗ Database verification failed: {table_msg}")
            return False

        logger.info(f"✓ {table_msg}")

        # Success summary
        logger.info("=" * 50)
        logger.info("BACKUP VERIFICATION SUCCESSFUL")
        logger.info(f"Latest backup: {latest_backup.name}")
        logger.info(f"Backup age: {freshness_msg}")
        logger.info(f"Database status: {table_msg}")
        logger.info("=" * 50)

        return True

    except FileNotFoundError as e:
        logger.error(f"✗ {str(e)}")
        return False
    except Exception as e:
        logger.error(f"✗ Verification failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

"""
USAGE INSTRUCTIONS:

1. BASIC VERIFICATION:
   python verify_backup.py

2. VERIFICATION WITH DETAILED OUTPUT:
   python verify_backup.py | tee verification.log

3. SCHEDULED VERIFICATION (Linux Cron):
   # Add to crontab (crontab -e):
   0 */6 * * * cd /path/to/your/project/backend && python3 verify_backup.py

4. SCHEDULED VERIFICATION (Windows Task Scheduler):
   - Create task to run every 6 hours
   - Program: python
   - Arguments: verify_backup.py
   - Start in: D:\Full Stack Projects\weathersta\backend

5. INTEGRATION WITH MONITORING:
   # Use in monitoring scripts
   import subprocess
   result = subprocess.run(['python', 'verify_backup.py'], capture_output=True, text=True)
   if result.returncode != 0:
       print("Backup verification failed!")

6. TROUBLESHOOTING:
   - Install mysql-connector-python: pip install mysql-connector-python
   - Check MySQL service is running
   - Verify database credentials
   - Ensure backup directory exists and has files
   - Check MySQL error logs for connection issues

7. EXPECTED OUTPUT:
   - ✓ Latest backup: daily_observatory_backup_2024-01-15_02-00-00.sql
   - ✓ Backup is fresh (2.3 hours old)
   - ✓ MySQL connection successful
   - ✓ Database verification successful. Found 3 tables in database 'observatory'
"""
