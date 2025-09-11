# MySQL Database Backup System

This directory contains a comprehensive MySQL database backup solution with automatic compression and retention management.

## Files

- `backup.py` - Main backup script
- `test_backup.py` - Test suite for backup functionality
- `requirements_backup.txt` - Dependencies (none required - uses standard library)
- `README_backup.md` - This documentation

## Features

✅ **Automated Database Export** - Uses `mysqldump` to export MySQL databases
✅ **Compression** - Automatically compresses backups to `.tar.gz` format
✅ **Retention Management** - Keeps only the latest 30 backups
✅ **Weekly/Daily Backups** - Automatically detects Sunday for weekly backups
✅ **Comprehensive Logging** - All actions logged to `backup.log`
✅ **Cross-Platform** - Works on Windows, Linux, and macOS
✅ **Error Handling** - Graceful error handling with detailed messages
✅ **No Dependencies** - Uses only Python standard library modules

## Quick Start

1. **Configure the script** by editing the variables at the top of `backup.py`:
   ```python
   DB_USER = "root"
   DB_PASS = "your_password"
   DB_NAME = "your_database"
   BACKUP_DIR = "backups"
   ```

2. **Run the backup**:
   ```bash
   python backup.py
   ```

3. **Check the results**:
   - Backup files: `backups/` directory
   - Log file: `backups/backup.log`

## Prerequisites

- Python 3.6 or higher
- MySQL client tools (`mysqldump` command)
- Write permissions to the backup directory

## Installation

### Windows
1. Install MySQL client tools (usually included with MySQL Server)
2. Add MySQL bin directory to your PATH environment variable
3. Verify installation: `mysqldump --version`

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install mysql-client
```

### Linux (CentOS/RHEL)
```bash
sudo yum install mysql
```

### macOS
```bash
brew install mysql-client
```

## Scheduling

### Windows Task Scheduler
1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task:
   - **Name**: "MySQL Daily Backup"
   - **Trigger**: Daily at 2:00 AM
   - **Action**: Start a program
   - **Program**: `python`
   - **Arguments**: `backup.py`
   - **Start in**: `D:\Full Stack Projects\weathersta\backend`

### Linux Cron
Add to crontab (`crontab -e`):
```bash
# Daily backup at 2:00 AM
0 2 * * * cd /path/to/your/project/backend && python3 backup.py

# Weekly backup on Sunday at 3:00 AM
0 3 * * 0 cd /path/to/your/project/backend && python3 backup.py
```

## Backup Types

- **Daily Backups**: `daily_database_backup_YYYY-MM-DD_HH-MM-SS.sql.tar.gz`
- **Weekly Backups**: `weekly_database_backup_YYYY-MM-DD_HH-MM-SS.sql.tar.gz` (Sundays only)

## File Structure

```
backups/
├── daily_observatory_backup_2024-01-15_02-00-00.sql.tar.gz
├── daily_observatory_backup_2024-01-16_02-00-00.sql.tar.gz
├── weekly_observatory_backup_2024-01-14_03-00-00.sql.tar.gz
└── backup.log
```

## Logging

All backup operations are logged to `backups/backup.log` with timestamps:
- Backup start/completion
- File creation and compression
- Cleanup operations
- Error messages and troubleshooting info

## Testing

Run the test suite to verify functionality:
```bash
python test_backup.py
```

## Troubleshooting

### Common Issues

1. **"mysqldump command not found"**
   - Install MySQL client tools
   - Add MySQL bin directory to PATH

2. **"Access denied for user"**
   - Check database credentials in `backup.py`
   - Verify MySQL user has backup privileges

3. **"Permission denied"**
   - Check write permissions for backup directory
   - Run with appropriate user privileges

4. **"No space left on device"**
   - Check available disk space
   - Adjust `MAX_BACKUPS` setting to keep fewer backups

### Verification

Test database restore:
```bash
# Extract backup
tar -xzf daily_observatory_backup_2024-01-15_02-00-00.sql.tar.gz

# Restore database
mysql -u root -p database_name < daily_observatory_backup_2024-01-15_02-00-00.sql
```

## Configuration Options

Edit these variables in `backup.py`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USER` | MySQL username | `"root"` |
| `DB_PASS` | MySQL password | `"Hasti@123"` |
| `DB_NAME` | Database name | `"observatory"` |
| `BACKUP_DIR` | Backup directory | `"backups"` |
| `MAX_BACKUPS` | Number of backups to keep | `30` |

## Security Notes

- Store database credentials securely
- Consider using MySQL configuration files instead of hardcoded passwords
- Ensure backup directory has appropriate permissions
- Consider encrypting backup files for sensitive data

## Support

For issues or questions:
1. Check the `backup.log` file for detailed error messages
2. Run `python test_backup.py` to verify functionality
3. Ensure all prerequisites are installed and configured
