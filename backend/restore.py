#!/usr/bin/env python3
"""
MySQL Database Restore Script
Restores a given .sql backup file into MySQL database.
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from datetime import datetime

# Configuration variables
DB_USER = "root"
DB_PASS = "Hasti@123"
DB_NAME = "observatory"
BACKUP_DIR = "backups"

def setup_logging():
    """Setup logging for restore operations."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    return logging.getLogger(__name__)

def validate_backup_file(backup_path):
    """Validate that the backup file exists and is readable."""
    backup_file = Path(backup_path)

    if not backup_file.exists():
        raise FileNotFoundError(f"Backup file not found: {backup_path}")

    if not backup_file.is_file():
        raise ValueError(f"Path is not a file: {backup_path}")

    if backup_file.suffix not in ['.sql', '.gz', '.tar.gz']:
        raise ValueError(f"Unsupported file format: {backup_file.suffix}")

    return backup_file

def extract_compressed_backup(backup_file):
    """Extract compressed backup file if needed."""
    if backup_file.suffix == '.sql':
        return backup_file

    # Handle compressed files
    if backup_file.suffix == '.gz' or backup_file.name.endswith('.tar.gz'):
        logger = logging.getLogger(__name__)
        logger.info(f"Compressed backup detected: {backup_file.name}")
        logger.info("Please extract the backup file manually before restoring.")
        logger.info("Use: tar -xzf filename.tar.gz")
        raise ValueError("Compressed backup files must be extracted first")

    return backup_file

def restore_database(backup_file, db_user, db_pass, db_name):
    """Restore database from SQL file using mysql command."""
    try:
        # Build mysql command
        cmd = [
            "mysql",
            f"--user={db_user}",
            f"--password={db_pass}",
            "--force",  # Continue on errors
            db_name
        ]

        logger = logging.getLogger(__name__)
        logger.info(f"Starting restore from: {backup_file.name}")
        logger.info(f"Target database: {db_name}")

        # Run mysql command with input from backup file
        with open(backup_file, 'r', encoding='utf-8') as f:
            result = subprocess.run(
                cmd,
                stdin=f,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )

        return True, "Database restored successfully"

    except subprocess.CalledProcessError as e:
        error_msg = f"MySQL restore failed: {e.stderr}"
        return False, error_msg
    except FileNotFoundError:
        error_msg = "mysql command not found. Please ensure MySQL client tools are installed and in PATH."
        return False, error_msg
    except Exception as e:
        error_msg = f"Unexpected error during restore: {str(e)}"
        return False, error_msg

def main():
    """Main restore function."""
    logger = setup_logging()

    # Check command line arguments
    if len(sys.argv) != 2:
        print("Usage: python restore.py <backup_file_path>")
        print("Example: python restore.py backups/daily_observatory_backup_2024-01-15_02-00-00.sql")
        sys.exit(1)

    backup_path = sys.argv[1]

    logger.info("=" * 50)
    logger.info("Starting MySQL restore process")
    logger.info(f"Backup file: {backup_path}")
    logger.info(f"Target database: {DB_NAME}")

    try:
        # Step 1: Validate backup file
        logger.info("Step 1: Validating backup file...")
        backup_file = validate_backup_file(backup_path)
        logger.info(f"✓ Backup file validated: {backup_file.name}")

        # Step 2: Handle compressed files
        logger.info("Step 2: Checking file format...")
        sql_file = extract_compressed_backup(backup_file)
        logger.info(f"✓ SQL file ready: {sql_file.name}")

        # Step 3: Restore database
        logger.info("Step 3: Restoring database...")
        success, message = restore_database(sql_file, DB_USER, DB_PASS, DB_NAME)

        if success:
            logger.info("=" * 50)
            logger.info("RESTORE COMPLETED SUCCESSFULLY")
            logger.info(f"Database '{DB_NAME}' restored from {sql_file.name}")
            logger.info("=" * 50)
            return True
        else:
            logger.error(f"Restore failed: {message}")
            return False

    except Exception as e:
        logger.error(f"Restore process failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

"""
USAGE INSTRUCTIONS:

1. BASIC RESTORE:
   python restore.py backups/daily_observatory_backup_2024-01-15_02-00-00.sql

2. RESTORE FROM COMPRESSED BACKUP:
   # First extract the compressed file
   tar -xzf backups/daily_observatory_backup_2024-01-15_02-00-00.sql.tar.gz

   # Then restore
   python restore.py daily_observatory_backup_2024-01-15_02-00-00.sql

3. RESTORE TO DIFFERENT DATABASE:
   # Edit the script to change DB_NAME variable
   # Or create a new database first:
   mysql -u root -p -e "CREATE DATABASE new_database_name;"
   # Then modify DB_NAME in the script and run restore

4. VERIFICATION AFTER RESTORE:
   mysql -u root -p -e "USE observatory; SHOW TABLES;"

5. TROUBLESHOOTING:
   - Ensure mysql command is in PATH
   - Check database credentials
   - Verify backup file is not corrupted
   - Check target database exists
   - Monitor MySQL error logs for detailed error messages

6. SAFETY NOTES:
   - Always backup current database before restoring
   - Test restore on a copy of production data first
   - Verify data integrity after restore
   - Consider database downtime during restore
"""
