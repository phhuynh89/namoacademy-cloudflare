# Cronjob Scripts

## Available Scripts

There are four scripts available:

### Account Creation Scripts

1. **`create-account-cron.sh`** - Generic script that accepts account type as parameter
   - Usage: `./scripts/create-account-cron.sh [felo|capcut]`
   - Default: `felo` (for backward compatibility)

2. **`create-felo-account-cron.sh`** - Dedicated script for Felo account creation
   - Usage: `./scripts/create-felo-account-cron.sh`

3. **`create-capcut-account-cron.sh`** - Dedicated script for CapCut account creation
   - Usage: `./scripts/create-capcut-account-cron.sh`

### Workflow Trigger Script

4. **`trigger-capcut-workflow.sh`** - Script to trigger CapCut account creation workflow via GitHub Actions
   - Usage: `./scripts/trigger-capcut-workflow.sh`
   - This script commits and pushes to the `trigger-action` branch to trigger the GitHub Actions workflow
   - Automatically handles branch creation, commits, and pushes

## Setup Cronjob for Automatic Account Creation

These scripts allow you to automatically run account creation using a cronjob.

### 1. Make the scripts executable (already done)
```bash
chmod +x scripts/create-account-cron.sh
chmod +x scripts/create-felo-account-cron.sh
chmod +x scripts/create-capcut-account-cron.sh
```

### 2. Test the script manually
```bash
# Test generic script with parameter
./scripts/create-account-cron.sh felo
./scripts/create-account-cron.sh capcut

# Test dedicated scripts
./scripts/create-felo-account-cron.sh
./scripts/create-capcut-account-cron.sh
```

### 3. Set up the cronjob

Edit your crontab:
```bash
crontab -e
```

**Option 1: Using the generic script with parameters**
```bash
# Run Felo account creation every 5 minutes
*/5 * * * * /Users/phuoc/Projects/namoacademy/namoacademy-cloudflare/scripts/create-account-cron.sh felo

# Run CapCut account creation every 10 minutes
*/10 * * * * /Users/phuoc/Projects/namoacademy/namoacademy-cloudflare/scripts/create-account-cron.sh capcut
```

**Option 2: Using dedicated scripts**
```bash
# Run Felo account creation every 5 minutes
*/5 * * * * /Users/phuoc/Projects/namoacademy/namoacademy-cloudflare/scripts/create-felo-account-cron.sh

# Run CapCut account creation every 10 minutes
*/10 * * * * /Users/phuoc/Projects/namoacademy/namoacademy-cloudflare/scripts/create-capcut-account-cron.sh
```

### 4. Verify cronjob is set up
```bash
crontab -l
```

### 5. Check logs
Logs are stored in the `logs/` directory:
```bash
# Generic script logs
tail -f logs/create-felo-account-$(date +%Y%m%d).log
tail -f logs/create-capcut-account-$(date +%Y%m%d).log

# Dedicated script logs
tail -f logs/create-felo-account-$(date +%Y%m%d).log
tail -f logs/create-capcut-account-$(date +%Y%m%d).log
```

## Notes

- The scripts automatically create a `logs/` directory if it doesn't exist
- Each day gets its own log file: `create-{type}-account-YYYYMMDD.log`
- The scripts check for Node.js, npm, and .dev.vars before running
- Make sure the worker is running (either locally or deployed) before the cronjob runs
- For production, consider using the deployed worker URL in `.dev.vars`

## Trigger GitHub Actions Workflow

To manually trigger the CapCut account creation workflow via GitHub Actions:

```bash
./scripts/trigger-capcut-workflow.sh
```

This script will:
1. Checkout or create the `trigger-action` branch
2. Create/update a trigger file with timestamp
3. Commit the changes
4. Push to the remote repository
5. Trigger the GitHub Actions workflow automatically

**Note:** Make sure you have:
- Git configured with proper credentials
- Push access to the repository
- The remote named `origin` (or modify the script to use your remote name)

## Troubleshooting

If the cronjob doesn't work:
1. Check that the script path in crontab is absolute (not relative)
2. Ensure Node.js and npm are in the PATH (cronjobs have limited PATH)
3. Check the log files for errors
4. Verify `.dev.vars` exists and has correct values
5. Make sure the worker is accessible at the URL specified in `WORKER_URL`

If the workflow trigger script doesn't work:
1. Verify you have git installed and configured
2. Check that you have push access to the repository
3. Ensure the remote is correctly configured (`git remote -v`)
4. Check that you're in a git repository
5. Verify the branch name matches the workflow trigger branch (`trigger-action`)

