#!/usr/bin/env python3
"""
MySQL Backup Monitoring Script
Monitors backup health and writes alerts to health.log.
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime, timedelta

# Configuration variables
DB_USER = "root"
DB_PASS = "Hasti@123"
DB_NAME = "observatory"
BACKUP_DIR = "backups"
HEALTH_LOG = "health.log"
ALERT_THRESHOLD_HOURS = 24

def setup_logging():
    """Setup logging for monitoring operations."""
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
        return None, "Backup directory does not exist"

    # Find all backup files
    backup_files = []
    for pattern in ["*.sql", "*.tar.gz", "*.gz"]:
        backup_files.extend(backup_path.glob(pattern))

    if not backup_files:
        return None, "No backup files found"

    # Sort by modification time (newest first)
    backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    return backup_files[0], "Latest backup found"

def check_backup_age(backup_file, threshold_hours):
    """Check if backup is within age threshold."""
    try:
        file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
        current_time = datetime.now()
        time_diff = current_time - file_time

        hours_old = time_diff.total_seconds() / 3600

        if hours_old <= threshold_hours:
            return True, f"Backup is fresh ({hours_old:.1f} hours old)"
        else:
            return False, f"Backup is stale ({hours_old:.1f} hours old)"

    except Exception as e:
        return False, f"Could not check backup age: {str(e)}"

def write_health_log(message, log_file):
    """Write message to health log file."""
    try:
        log_path = Path(log_file)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {message}\n")

        return True, "Health log updated"

    except Exception as e:
        return False, f"Failed to write health log: {str(e)}"

def get_backup_statistics(backup_dir):
    """Get backup directory statistics."""
    backup_path = Path(backup_dir)

    if not backup_path.exists():
        return "Backup directory does not exist"

    # Count backup files
    backup_files = []
    for pattern in ["*.sql", "*.tar.gz", "*.gz"]:
        backup_files.extend(backup_path.glob(pattern))

    if not backup_files:
        return "No backup files found"

    # Calculate statistics
    total_files = len(backup_files)
    total_size = sum(f.stat().st_size for f in backup_files)

    # Categorize by type
    daily_count = len([f for f in backup_files if 'daily_' in f.name])
    weekly_count = len([f for f in backup_files if 'weekly_' in f.name])

    # Find age range
    file_times = [datetime.fromtimestamp(f.stat().st_mtime) for f in backup_files]
    newest = max(file_times)
    oldest = min(file_times)

    return f"Total: {total_files} files, Daily: {daily_count}, Weekly: {weekly_count}, Size: {total_size / 1024 / 1024:.1f} MB, Range: {oldest.strftime('%Y-%m-%d')} to {newest.strftime('%Y-%m-%d')}"

def main():
    """Main monitoring function."""
    logger = setup_logging()

    logger.info("=" * 50)
    logger.info("Starting backup health monitoring")
    logger.info(f"Backup directory: {BACKUP_DIR}")
    logger.info(f"Alert threshold: {ALERT_THRESHOLD_HOURS} hours")
    logger.info(f"Health log: {HEALTH_LOG}")

    try:
        # Step 1: Find latest backup
        logger.info("Step 1: Finding latest backup...")
        latest_backup, backup_msg = get_latest_backup(BACKUP_DIR)

        if latest_backup is None:
            alert_msg = f"ALERT: {backup_msg}"
            logger.error(f"✗ {alert_msg}")

            # Write alert to health log
            write_health_log(alert_msg, HEALTH_LOG)
            return False

        logger.info(f"✓ Latest backup: {latest_backup.name}")

        # Step 2: Check backup age
        logger.info("Step 2: Checking backup age...")
        is_fresh, age_msg = check_backup_age(latest_backup, ALERT_THRESHOLD_HOURS)

        if is_fresh:
            logger.info(f"✓ {age_msg}")

            # Write healthy status to log
            healthy_msg = f"Backup healthy - {latest_backup.name} ({age_msg})"
            write_health_log(healthy_msg, HEALTH_LOG)

            # Get and log statistics
            stats = get_backup_statistics(BACKUP_DIR)
            logger.info(f"✓ Backup statistics: {stats}")

            logger.info("=" * 50)
            logger.info("BACKUP MONITORING: HEALTHY")
            logger.info(f"Latest backup: {latest_backup.name}")
            logger.info(f"Age: {age_msg}")
            logger.info(f"Statistics: {stats}")
            logger.info("=" * 50)

            return True
        else:
            alert_msg = f"ALERT: {age_msg} - {latest_backup.name}"
            logger.error(f"✗ {alert_msg}")

            # Write alert to health log
            write_health_log(alert_msg, HEALTH_LOG)

            # Get and log statistics
            stats = get_backup_statistics(BACKUP_DIR)
            logger.error(f"Backup statistics: {stats}")

            logger.error("=" * 50)
            logger.error("BACKUP MONITORING: ALERT")
            logger.error(f"Latest backup: {latest_backup.name}")
            logger.error(f"Age: {age_msg}")
            logger.error(f"Statistics: {stats}")
            logger.error("=" * 50)

            return False

    except Exception as e:
        error_msg = f"ALERT: Monitoring failed - {str(e)}"
        logger.error(f"✗ {error_msg}")

        # Write error to health log
        write_health_log(error_msg, HEALTH_LOG)

        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

"""
USAGE INSTRUCTIONS:

1. BASIC MONITORING:
   python monitor_backups.py

2. MONITORING WITH LOG OUTPUT:
   python monitor_backups.py | tee monitoring.log

3. SCHEDULED MONITORING (Linux Cron):
   # Add to crontab (crontab -e):
   # Check every hour
   0 * * * * cd /path/to/your/project/backend && python3 monitor_backups.py

   # Check every 6 hours
   0 */6 * * * cd /path/to/your/project/backend && python3 monitor_backups.py

4. SCHEDULED MONITORING (Windows Task Scheduler):
   - Create task to run every hour
   - Program: python
   - Arguments: monitor_backups.py
   - Start in: D:\Full Stack Projects\weathersta\backend

5. INTEGRATION WITH MONITORING SYSTEMS:
   # Use in monitoring scripts
   import subprocess
   result = subprocess.run(['python', 'monitor_backups.py'], capture_output=True, text=True)
   if result.returncode != 0:
       # Send alert to monitoring system
       send_alert("Backup monitoring failed!")

6. HEALTH LOG MONITORING:
   # Check health log for alerts
   tail -f health.log

   # Search for alerts
   grep "ALERT" health.log

   # Get recent health status
   tail -20 health.log

7. CONFIGURATION:
   # Adjust alert threshold (hours)
   ALERT_THRESHOLD_HOURS = 24  # Alert if backup older than 24 hours

   # Change health log location
   HEALTH_LOG = "logs/health.log"

8. TROUBLESHOOTING:
   - Check backup directory exists and has files
   - Verify file permissions for health log
   - Monitor disk space for backup storage
   - Check system time accuracy
   - Review health.log for error patterns

9. EXPECTED HEALTH LOG OUTPUT:
   [2024-01-15 14:30:00] Backup healthy - daily_observatory_backup_2024-01-15_02-00-00.sql (Backup is fresh (12.5 hours old))
   [2024-01-15 15:30:00] ALERT: Backup is stale (25.2 hours old) - daily_observatory_backup_2024-01-14_02-00-00.sql
"""
