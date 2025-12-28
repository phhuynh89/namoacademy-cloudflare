# Cronjob Scripts

## Setup Cronjob for Automatic Account Creation

This script allows you to automatically run account creation every minute using a cronjob.

### 1. Make the script executable (already done)
```bash
chmod +x scripts/create-account-cron.sh
```

### 2. Test the script manually
```bash
./scripts/create-account-cron.sh
```

### 3. Set up the cronjob

Edit your crontab:
```bash
crontab -e
```

Add this line to run every minute:
```bash
* * * * * /Users/phuoc/Projects/namoacademy-cloudflare/scripts/create-account-cron.sh
```

Or if you want to run it every 5 minutes:
```bash
*/5 * * * * /Users/phuoc/Projects/namoacademy-cloudflare/scripts/create-account-cron.sh
```

### 4. Verify cronjob is set up
```bash
crontab -l
```

### 5. Check logs
Logs are stored in the `logs/` directory:
```bash
tail -f logs/create-account-$(date +%Y%m%d).log
```

## Notes

- The script automatically creates a `logs/` directory if it doesn't exist
- Each day gets its own log file: `create-account-YYYYMMDD.log`
- The script checks for Node.js, npm, and .dev.vars before running
- Make sure the worker is running (either locally or deployed) before the cronjob runs
- For production, consider using the deployed worker URL in `.dev.vars`

## Troubleshooting

If the cronjob doesn't work:
1. Check that the script path in crontab is absolute (not relative)
2. Ensure Node.js and npm are in the PATH (cronjobs have limited PATH)
3. Check the log files for errors
4. Verify `.dev.vars` exists and has correct values
5. Make sure the worker is accessible at the URL specified in `WORKER_URL`

