#!/usr/bin/env python3
"""
MySQL Database Backup Script
Automates MySQL database backups with compression and retention management.
"""

import os
import sys
import subprocess
import shutil
import logging
from datetime import datetime
from pathlib import Path

# Configuration variables
DB_USER = "root"
DB_PASS = "Hasti@123"
DB_NAME = "observatory"
BACKUP_DIR = "backups"

# Backup retention settings
MAX_BACKUPS = 30

def setup_logging(backup_dir):
    """Setup logging to backup.log file in the backup directory."""
    log_file = Path(backup_dir) / "backup.log"
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def create_backup_directory(backup_dir):
    """Create backup directory if it doesn't exist."""
    backup_path = Path(backup_dir)
    backup_path.mkdir(exist_ok=True)
    return backup_path

def generate_backup_filename(db_name, is_weekly=False):
    """Generate backup filename with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    prefix = "weekly" if is_weekly else "daily"
    return f"{prefix}_{db_name}_backup_{timestamp}.sql"

def is_weekly_backup():
    """Check if today is Sunday (weekly backup day)."""
    return datetime.now().weekday() == 6  # Sunday is 6

def run_mysqldump(db_user, db_pass, db_name, output_file):
    """Run mysqldump command to export database."""
    try:
        # Build mysqldump command
        cmd = [
            "mysqldump",
            f"--user={db_user}",
            f"--password={db_pass}",
            "--single-transaction",
            "--routines",
            "--triggers",
            "--events",
            "--add-drop-database",
            "--add-drop-table",
            "--create-options",
            "--disable-keys",
            "--extended-insert",
            "--quick",
            "--lock-tables=false",
            db_name
        ]

        # Run mysqldump and redirect output to file
        with open(output_file, 'w', encoding='utf-8') as f:
            result = subprocess.run(
                cmd,
                stdout=f,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )

        return True, "Database exported successfully"

    except subprocess.CalledProcessError as e:
        error_msg = f"mysqldump failed: {e.stderr}"
        return False, error_msg
    except FileNotFoundError:
        error_msg = "mysqldump command not found. Please ensure MySQL client tools are installed and in PATH."
        return False, error_msg
    except Exception as e:
        error_msg = f"Unexpected error during mysqldump: {str(e)}"
        return False, error_msg

def compress_backup(sql_file, backup_dir):
    """Compress SQL file to tar.gz format."""
    try:
        sql_path = Path(sql_file)
        archive_name = sql_path.stem  # Remove .sql extension
        archive_path = backup_dir / archive_name

        # Create tar.gz archive
        shutil.make_archive(str(archive_path), 'gztar', backup_dir, sql_path.name)

        # Remove original SQL file after compression
        sql_path.unlink()

        return str(archive_path) + ".tar.gz", "Backup compressed successfully"

    except Exception as e:
        error_msg = f"Compression failed: {str(e)}"
        return None, error_msg

def cleanup_old_backups(backup_dir, max_backups):
    """Remove old backup files, keeping only the latest ones."""
    try:
        backup_path = Path(backup_dir)

        # Get all backup files (both .sql and .tar.gz)
        backup_files = []
        for pattern in ["*.sql", "*.tar.gz"]:
            backup_files.extend(backup_path.glob(pattern))

        # Sort by modification time (newest first)
        backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

        # Remove excess backups
        files_to_remove = backup_files[max_backups:]
        for file_path in files_to_remove:
            file_path.unlink()
            logging.info(f"Removed old backup: {file_path.name}")

        return len(files_to_remove), "Old backups cleaned up successfully"

    except Exception as e:
        error_msg = f"Cleanup failed: {str(e)}"
        return 0, error_msg

def main():
    """Main backup function."""
    # Setup
    backup_path = create_backup_directory(BACKUP_DIR)
    logger = setup_logging(BACKUP_DIR)

    logger.info("=" * 50)
    logger.info("Starting MySQL backup process")
    logger.info(f"Database: {DB_NAME}")
    logger.info(f"Backup directory: {backup_path.absolute()}")

    # Check if it's a weekly backup
    is_weekly = is_weekly_backup()
    backup_type = "weekly" if is_weekly else "daily"
    logger.info(f"Backup type: {backup_type}")

    # Generate filename
    sql_filename = generate_backup_filename(DB_NAME, is_weekly)
    sql_filepath = backup_path / sql_filename

    try:
        # Step 1: Export database
        logger.info("Step 1: Exporting database...")
        success, message = run_mysqldump(DB_USER, DB_PASS, DB_NAME, sql_filepath)

        if not success:
            logger.error(f"Database export failed: {message}")
            return False

        logger.info(f"Database exported to: {sql_filename}")

        # Step 2: Compress backup
        logger.info("Step 2: Compressing backup...")
        compressed_file, compress_message = compress_backup(sql_filepath, backup_path)

        if not compressed_file:
            logger.error(f"Compression failed: {compress_message}")
            return False

        logger.info(f"Backup compressed to: {Path(compressed_file).name}")

        # Step 3: Cleanup old backups
        logger.info("Step 3: Cleaning up old backups...")
        removed_count, cleanup_message = cleanup_old_backups(backup_path, MAX_BACKUPS)

        if removed_count > 0:
            logger.info(f"Removed {removed_count} old backup(s)")

        # Success summary
        logger.info("=" * 50)
        logger.info("BACKUP COMPLETED SUCCESSFULLY")
        logger.info(f"Compressed file: {Path(compressed_file).name}")
        logger.info(f"File size: {Path(compressed_file).stat().st_size / 1024 / 1024:.2f} MB")
        logger.info("=" * 50)

        return True

    except Exception as e:
        logger.error(f"Backup process failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

"""
USAGE INSTRUCTIONS:

1. MANUAL EXECUTION:
   python backup.py

   Or on Linux/Mac:
   chmod +x backup.py
   ./backup.py

2. LINUX CRON SCHEDULING:

   Edit crontab:
   crontab -e

   Add these lines for daily and weekly backups:

   # Daily backup at 2:00 AM
   0 2 * * * cd /path/to/your/project/backend && python3 backup.py

   # Weekly backup on Sunday at 3:00 AM
   0 3 * * 0 cd /path/to/your/project/backend && python3 backup.py

   # Check cron logs:
   tail -f /var/log/cron

3. WINDOWS TASK SCHEDULER:

   a) Open Task Scheduler (taskschd.msc)
   b) Create Basic Task:
      - Name: "MySQL Daily Backup"
      - Trigger: Daily at 2:00 AM
      - Action: Start a program
      - Program: python
      - Arguments: backup.py
      - Start in: D:\Full Stack Projects\weathersta\backend

   c) Create another task for weekly:
      - Name: "MySQL Weekly Backup"
      - Trigger: Weekly on Sunday at 3:00 AM
      - Action: Start a program
      - Program: python
      - Arguments: backup.py
      - Start in: D:\Full Stack Projects\weathersta\backend

4. VERIFICATION:
   - Check backup.log for execution history
   - Verify backups in the backups/ directory
   - Test restore: mysql -u root -p database_name < backup_file.sql

5. TROUBLESHOOTING:
   - Ensure mysqldump is in PATH
   - Check MySQL credentials
   - Verify write permissions to backup directory
   - Monitor disk space for backup storage
"""
