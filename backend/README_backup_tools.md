# MySQL Backup Tools Suite

A comprehensive set of Python scripts for MySQL database backup management, monitoring, and restoration.

## 📁 Scripts Overview

| Script | Purpose | Dependencies |
|--------|---------|--------------|
| `backup.py` | Create automated MySQL backups | None (standard library) |
| `restore.py` | Restore database from backup files | None (standard library) |
| `list_backups.py` | List and analyze backup files | None (standard library) |
| `verify_backup.py` | Verify backup integrity and database health | mysql-connector-python |
| `monitor_backups.py` | Monitor backup health and generate alerts | None (standard library) |

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   pip install -r requirements_backup_tools.txt
   ```

2. **Configure database credentials** in each script:
   ```python
   DB_USER = "root"
   DB_PASS = "your_password"
   DB_NAME = "your_database"
   ```

3. **Create a backup**:
   ```bash
   python backup.py
   ```

4. **List available backups**:
   ```bash
   python list_backups.py
   ```

5. **Verify backup health**:
   ```bash
   python verify_backup.py
   ```

6. **Monitor backup status**:
   ```bash
   python monitor_backups.py
   ```

## 📋 Detailed Usage

### 1. backup.py - Create Backups

**Features:**
- Automated MySQL database export using `mysqldump`
- Automatic compression to `.tar.gz` format
- Daily and weekly backup detection
- Retention management (keeps latest 30 backups)
- Comprehensive logging

**Usage:**
```bash
# Create backup
python backup.py

# Check backup log
tail -f backups/backup.log
```

**Configuration:**
```python
DB_USER = "root"
DB_PASS = "Hasti@123"
DB_NAME = "observatory"
BACKUP_DIR = "backups"
MAX_BACKUPS = 30
```

### 2. restore.py - Restore Backups

**Features:**
- Restore database from SQL backup files
- Support for compressed backups (with extraction instructions)
- Command-line argument support
- Error handling and validation

**Usage:**
```bash
# Restore from SQL file
python restore.py backups/daily_observatory_backup_2024-01-15_02-00-00.sql

# Restore from compressed backup (extract first)
tar -xzf backups/daily_observatory_backup_2024-01-15_02-00-00.sql.tar.gz
python restore.py daily_observatory_backup_2024-01-15_02-00-00.sql
```

### 3. list_backups.py - List and Analyze Backups

**Features:**
- List all backup files with details
- File size, modification date, and type information
- Backup statistics and summary
- Sorting by newest first

**Usage:**
```bash
# List all backups
python list_backups.py

# Save list to file
python list_backups.py > backup_list.txt

# Filter by date (Linux/Mac)
python list_backups.py | grep "2024-01-15"
```

### 4. verify_backup.py - Verify Backup Integrity

**Features:**
- Connect to MySQL and verify database health
- Check table existence and structure
- Verify backup freshness
- Database connection testing

**Usage:**
```bash
# Verify latest backup
python verify_backup.py

# Save verification results
python verify_backup.py > verification.log
```

**Requirements:**
```bash
pip install mysql-connector-python
```

### 5. monitor_backups.py - Monitor Backup Health

**Features:**
- Check backup age and freshness
- Generate alerts for stale backups
- Write health status to `health.log`
- Backup statistics and monitoring

**Usage:**
```bash
# Check backup health
python monitor_backups.py

# Monitor health log
tail -f health.log

# Search for alerts
grep "ALERT" health.log
```

## ⚙️ Configuration

### Database Settings

Edit these variables in each script:

```python
DB_USER = "root"           # MySQL username
DB_PASS = "Hasti@123"      # MySQL password
DB_NAME = "observatory"    # Database name
BACKUP_DIR = "backups"     # Backup directory
```

### Monitoring Settings

In `monitor_backups.py`:

```python
ALERT_THRESHOLD_HOURS = 24  # Alert if backup older than 24 hours
HEALTH_LOG = "health.log"   # Health log file location
```

## 📅 Scheduling

### Linux Cron

Add to crontab (`crontab -e`):

```bash
# Daily backup at 2:00 AM
0 2 * * * cd /path/to/your/project/backend && python3 backup.py

# Weekly backup on Sunday at 3:00 AM
0 3 * * 0 cd /path/to/your/project/backend && python3 backup.py

# Monitor every hour
0 * * * * cd /path/to/your/project/backend && python3 monitor_backups.py

# Verify every 6 hours
0 */6 * * * cd /path/to/your/project/backend && python3 verify_backup.py
```

### Windows Task Scheduler

1. **Daily Backup Task**:
   - Name: "MySQL Daily Backup"
   - Trigger: Daily at 2:00 AM
   - Action: Start a program
   - Program: `python`
   - Arguments: `backup.py`
   - Start in: `D:\Full Stack Projects\weathersta\backend`

2. **Monitoring Task**:
   - Name: "MySQL Backup Monitor"
   - Trigger: Every hour
   - Action: Start a program
   - Program: `python`
   - Arguments: `monitor_backups.py`
   - Start in: `D:\Full Stack Projects\weathersta\backend`

## 📊 File Structure

```
backups/
├── daily_observatory_backup_2024-01-15_02-00-00.sql.tar.gz
├── daily_observatory_backup_2024-01-16_02-00-00.sql.tar.gz
├── weekly_observatory_backup_2024-01-14_03-00-00.sql.tar.gz
└── backup.log

health.log
backup_tools/
├── backup.py
├── restore.py
├── list_backups.py
├── verify_backup.py
├── monitor_backups.py
├── requirements_backup_tools.txt
└── README_backup_tools.md
```

## 🔍 Monitoring and Alerts

### Health Log Format

```
[2024-01-15 14:30:00] Backup healthy - daily_observatory_backup_2024-01-15_02-00-00.sql (Backup is fresh (12.5 hours old))
[2024-01-15 15:30:00] ALERT: Backup is stale (25.2 hours old) - daily_observatory_backup_2024-01-14_02-00-00.sql
```

### Alert Types

- **Backup Stale**: No backup created within threshold hours
- **No Backups**: No backup files found
- **Connection Failed**: Cannot connect to MySQL
- **Verification Failed**: Database structure issues

## 🛠️ Troubleshooting

### Common Issues

1. **"mysqldump command not found"**
   - Install MySQL client tools
   - Add MySQL bin directory to PATH

2. **"mysql command not found"**
   - Install MySQL client tools
   - Add MySQL bin directory to PATH

3. **"mysql-connector-python not installed"**
   - Run: `pip install mysql-connector-python`

4. **"Access denied for user"**
   - Check database credentials
   - Verify MySQL user has backup/restore privileges

5. **"Permission denied"**
   - Check write permissions for backup directory
   - Run with appropriate user privileges

### Verification Steps

1. **Test backup creation**:
   ```bash
   python backup.py
   python list_backups.py
   ```

2. **Test restore process**:
   ```bash
   python restore.py backups/latest_backup.sql
   ```

3. **Test verification**:
   ```bash
   python verify_backup.py
   ```

4. **Test monitoring**:
   ```bash
   python monitor_backups.py
   ```

## 🔒 Security Considerations

- Store database credentials securely
- Consider using MySQL configuration files instead of hardcoded passwords
- Ensure backup directory has appropriate permissions
- Consider encrypting backup files for sensitive data
- Regularly rotate backup files
- Monitor backup logs for suspicious activity

## 📈 Performance Tips

- Schedule backups during low-usage periods
- Monitor disk space for backup storage
- Consider compression for large databases
- Use incremental backups for very large databases
- Monitor backup completion times
- Set appropriate retention policies

## 🤝 Integration

### With Monitoring Systems

```python
import subprocess

# Check backup health
result = subprocess.run(['python', 'monitor_backups.py'],
                       capture_output=True, text=True)
if result.returncode != 0:
    send_alert("Backup monitoring failed!")

# Verify backup integrity
result = subprocess.run(['python', 'verify_backup.py'],
                       capture_output=True, text=True)
if result.returncode != 0:
    send_alert("Backup verification failed!")
```

### With CI/CD Pipelines

```yaml
# Example GitHub Actions workflow
- name: Backup Database
  run: |
    cd backend
    python backup.py
    python verify_backup.py
```

## 📚 Additional Resources

- [MySQL Backup and Recovery](https://dev.mysql.com/doc/refman/8.0/en/backup-and-recovery.html)
- [mysqldump Documentation](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)
- [Python subprocess Documentation](https://docs.python.org/3/library/subprocess.html)
- [Cron Scheduling Guide](https://crontab.guru/)
- [Windows Task Scheduler Guide](https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page)
