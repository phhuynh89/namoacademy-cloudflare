# Cron Setup for Trigger Script

## CapCut Workflow Trigger (Every 5 Minutes)

To set up a cron job that triggers the CapCut account creation workflow every 5 minutes:

### 1. Edit your crontab:
```bash
crontab -e
```

### 2. Add this line (adjust the path to match your server):
```bash
*/5 * * * * /path/to/namoacademy-cloudflare/scripts/trigger-capcut-workflow.sh >> /path/to/namoacademy-cloudflare/logs/trigger-workflow.log 2>&1
```

### 3. Example with full path (replace with your actual path):
```bash
*/5 * * * * /home/user/namoacademy-cloudflare/scripts/trigger-capcut-workflow.sh >> /home/user/namoacademy-cloudflare/logs/trigger-workflow.log 2>&1
```

### 4. Or if you want to run from the project directory:
```bash
*/5 * * * * cd /path/to/namoacademy-cloudflare && ./scripts/trigger-capcut-workflow.sh >> logs/trigger-workflow.log 2>&1
```

## Important Notes

1. **Use absolute paths**: Cron jobs run with a minimal environment, so always use absolute paths
2. **Set PATH if needed**: If git is not in the default PATH, add it:
   ```bash
   PATH=/usr/local/bin:/usr/bin:/bin
   */5 * * * * /path/to/namoacademy-cloudflare/scripts/trigger-capcut-workflow.sh >> /path/to/namoacademy-cloudflare/logs/trigger-workflow.log 2>&1
   ```

3. **Git credentials**: Make sure git is configured with proper credentials (SSH keys or credential helper) for the cron user

4. **Logs**: The output will be logged to `logs/trigger-workflow.log` for debugging

## Verify Cron Job

After adding the cron job:
```bash
# List all cron jobs
crontab -l

# Check cron logs (location varies by system)
# On Ubuntu/Debian:
grep CRON /var/log/syslog

# On CentOS/RHEL:
grep CRON /var/log/cron
```

## Troubleshooting

If the cron job doesn't work:

1. **Check script permissions**:
   ```bash
   chmod +x /path/to/namoacademy-cloudflare/scripts/trigger-capcut-workflow.sh
   ```

2. **Test the script manually**:
   ```bash
   /path/to/namoacademy-cloudflare/scripts/trigger-capcut-workflow.sh
   ```

3. **Check git configuration**:
   ```bash
   # Run as the cron user
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

4. **Check SSH keys** (if using SSH for git):
   ```bash
   # Test SSH connection
   ssh -T git@github.com
   ```

5. **View cron job output**:
   ```bash
   tail -f /path/to/namoacademy-cloudflare/logs/trigger-workflow.log
   ```

