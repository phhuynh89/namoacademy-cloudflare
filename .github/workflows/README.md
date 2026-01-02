# GitHub Actions Workflows

## Account Creation Workflows

There are two workflows available for automatic account creation:

1. **Create Felo Account** (`create-account.yml`) - Creates Felo accounts
2. **Create CapCut Account** (`create-capcut-account.yml`) - Creates CapCut accounts

Both workflows use Puppeteer to automate account creation on a scheduled basis.

## Setup Instructions

### 1. Add GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets (shared by both workflows):

- `WORKER_URL` - Your deployed Cloudflare Worker URL (e.g., `https://namoacademy-api.huynhphvan.workers.dev`)
- `ACCOUNTS_PER_RUN` (optional) - Number of accounts to create per workflow run (default: 1)

### 2. Configure Schedule

#### Felo Account Workflow

The Felo workflow is set to run every 5 minutes by default. To change the schedule, edit `.github/workflows/create-account.yml`:

```yaml
schedule:
  - cron: '*/5 * * * *'  # Every 5 minutes (minimum)
```

#### CapCut Account Workflow

The CapCut workflow runs at :02, :07, :12, :17, :22, :27, :32, :37, :42, :47, :52, :57 minutes (every 5 minutes, offset by 2 minutes to avoid conflicts with Felo). To change the schedule, edit `.github/workflows/create-capcut-account.yml`:

```yaml
schedule:
  - cron: '2,7,12,17,22,27,32,37,42,47,52,57 * * * *'  # Every 5 minutes, offset by 2
```

**Important Notes:**
- GitHub Actions has a **minimum interval of 5 minutes** for scheduled workflows
- Schedules use **UTC time**, not your local timezone
- Workflows must be in the **default branch** (usually `main` or `master`)

Common cron patterns:
- `'*/5 * * * *'` - Every 5 minutes (minimum allowed)
- `'*/10 * * * *'` - Every 10 minutes
- `'0 * * * *'` - Every hour
- `'0 */6 * * *'` - Every 6 hours
- `'0 0 * * *'` - Daily at midnight UTC

### 3. Manual Trigger

You can manually trigger either workflow:
- Go to Actions tab in GitHub
- Select "Create Felo Account" or "Create CapCut Account" workflow
- Click "Run workflow"

## Workflow Features

Both workflows include:

- ✅ Runs on Ubuntu latest
- ✅ Uses Node.js 20
- ✅ Installs all Puppeteer dependencies
- ✅ Runs in headless mode (no display needed)
- ✅ Continues on error (won't fail the workflow if account creation fails)
- ✅ Uploads logs as artifacts (if logs directory exists)
- ✅ Caches npm dependencies for faster runs

## Monitoring

- Check the Actions tab to see workflow runs
- View logs for each run to see what happened
- Download artifacts to see detailed logs (if any)
- Felo logs: `felo-account-creation-logs` artifact
- CapCut logs: `capcut-account-creation-logs` artifact

## Notes

- Make sure your Cloudflare Worker is deployed and accessible
- The worker must have the appropriate database tables created:
  - `felo_accounts` table for Felo accounts
  - `capcut_accounts` table for CapCut accounts
- Each run creates one account by default (configurable via `ACCOUNTS_PER_RUN` secret)
- The workflows run independently and can run simultaneously

## Troubleshooting

If a workflow fails:

1. Check the workflow logs in the Actions tab
2. Verify all secrets are set correctly
3. Ensure the WORKER_URL is accessible
4. Check that the database migrations are applied
5. Verify testmail.app/Boomlify credentials are valid
6. Check the uploaded log artifacts for detailed error messages

