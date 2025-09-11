#!/usr/bin/env python3
"""
MySQL Backup Listing Script
Lists all backup files in the backup directory with details.
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Configuration variables
BACKUP_DIR = "backups"

def format_file_size(size_bytes):
    """Convert bytes to human readable format."""
    if size_bytes == 0:
        return "0 B"

    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1

    return f"{size_bytes:.2f} {size_names[i]}"

def format_timestamp(timestamp):
    """Format timestamp to readable string."""
    return timestamp.strftime("%Y-%m-%d %H:%M:%S")

def get_backup_info(backup_file):
    """Get backup file information."""
    try:
        stat = backup_file.stat()
        size = stat.st_size
        modified = datetime.fromtimestamp(stat.st_mtime)

        return {
            'name': backup_file.name,
            'size': size,
            'size_formatted': format_file_size(size),
            'modified': modified,
            'modified_formatted': format_timestamp(modified)
        }
    except Exception as e:
        return {
            'name': backup_file.name,
            'size': 0,
            'size_formatted': "Unknown",
            'modified': None,
            'modified_formatted': "Unknown",
            'error': str(e)
        }

def list_backup_files(backup_dir):
    """List all backup files in the directory."""
    backup_path = Path(backup_dir)

    if not backup_path.exists():
        print(f"Backup directory does not exist: {backup_dir}")
        return []

    if not backup_path.is_dir():
        print(f"Path is not a directory: {backup_dir}")
        return []

    # Find all backup files (SQL and compressed)
    backup_files = []
    for pattern in ["*.sql", "*.tar.gz", "*.gz"]:
        backup_files.extend(backup_path.glob(pattern))

    return backup_files

def print_backup_list(backup_files):
    """Print formatted backup list."""
    if not backup_files:
        print("No backup files found.")
        return

    # Sort by modification time (newest first)
    backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    print("=" * 80)
    print("BACKUP FILES LIST")
    print("=" * 80)
    print(f"{'Filename':<50} {'Size':<12} {'Modified':<20}")
    print("-" * 80)

    total_size = 0
    for backup_file in backup_files:
        info = get_backup_info(backup_file)

        if 'error' in info:
            print(f"{info['name']:<50} {'ERROR':<12} {info['modified_formatted']:<20}")
            print(f"  Error: {info['error']}")
        else:
            print(f"{info['name']:<50} {info['size_formatted']:<12} {info['modified_formatted']:<20}")
            total_size += info['size']

    print("-" * 80)
    print(f"Total files: {len(backup_files)}")
    print(f"Total size: {format_file_size(total_size)}")
    print("=" * 80)

def print_backup_summary(backup_files):
    """Print backup summary statistics."""
    if not backup_files:
        return

    # Categorize backups
    daily_backups = [f for f in backup_files if 'daily_' in f.name]
    weekly_backups = [f for f in backup_files if 'weekly_' in f.name]
    sql_backups = [f for f in backup_files if f.suffix == '.sql']
    compressed_backups = [f for f in backup_files if f.suffix in ['.gz', '.tar.gz']]

    print("\nBACKUP SUMMARY")
    print("-" * 40)
    print(f"Daily backups: {len(daily_backups)}")
    print(f"Weekly backups: {len(weekly_backups)}")
    print(f"SQL files: {len(sql_backups)}")
    print(f"Compressed files: {len(compressed_backups)}")

    # Find newest and oldest
    if backup_files:
        newest = min(backup_files, key=lambda x: x.stat().st_mtime)
        oldest = max(backup_files, key=lambda x: x.stat().st_mtime)

        newest_info = get_backup_info(newest)
        oldest_info = get_backup_info(oldest)

        print(f"Newest backup: {newest_info['name']} ({newest_info['modified_formatted']})")
        print(f"Oldest backup: {oldest_info['name']} ({oldest_info['modified_formatted']})")

def main():
    """Main function."""
    print("MySQL Backup File Lister")
    print("=" * 40)

    try:
        # List backup files
        backup_files = list_backup_files(BACKUP_DIR)

        # Print backup list
        print_backup_list(backup_files)

        # Print summary
        print_backup_summary(backup_files)

        return True

    except Exception as e:
        print(f"Error listing backups: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

"""
USAGE INSTRUCTIONS:

1. BASIC LISTING:
   python list_backups.py

2. LIST WITH DETAILED INFO:
   python list_backups.py | more

3. SAVE LIST TO FILE:
   python list_backups.py > backup_list.txt

4. FILTER BY DATE (Linux/Mac):
   python list_backups.py | grep "2024-01-15"

5. FILTER BY SIZE (Linux/Mac):
   python list_backups.py | grep "MB"

6. INTEGRATION WITH OTHER SCRIPTS:
   # Get list of backup files programmatically
   from list_backups import list_backup_files, get_backup_info
   files = list_backup_files("backups")
   for file in files:
       info = get_backup_info(file)
       print(f"{info['name']}: {info['size_formatted']}")

7. TROUBLESHOOTING:
   - Check backup directory path
   - Verify file permissions
   - Ensure backup files are not corrupted
   - Check disk space if files appear with 0 size
"""
