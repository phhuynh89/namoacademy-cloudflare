# GitHub Actions Workflows

## Create Account Workflow

This workflow automatically creates Felo accounts using Puppeteer on a scheduled basis.

### Setup Instructions

1. **Add GitHub Secrets**

   Go to your repository → Settings → Secrets and variables → Actions → New repository secret

   Add the following secrets:

   - `TESTMAIL_API_KEY` - Your testmail.app API key
   - `TESTMAIL_NAMESPACE` - Your testmail.app namespace
   - `WORKER_URL` - Your deployed Cloudflare Worker URL (e.g., `https://namoacademy-api.huynhphvan.workers.dev`)

2. **Configure Schedule**

   The workflow is set to run every minute by default. To change the schedule, edit `.github/workflows/create-account.yml` and modify the cron expression:

   ```yaml
   schedule:
     - cron: '* * * * *'  # Every minute
   ```

   Common cron patterns:
   - `'*/5 * * * *'` - Every 5 minutes
   - `'0 * * * *'` - Every hour
   - `'0 */6 * * *'` - Every 6 hours
   - `'0 0 * * *'` - Daily at midnight

3. **Manual Trigger**

   You can manually trigger the workflow:
   - Go to Actions tab in GitHub
   - Select "Create Felo Account" workflow
   - Click "Run workflow"

### Workflow Features

- ✅ Runs on Ubuntu latest
- ✅ Uses Node.js 20
- ✅ Installs all Puppeteer dependencies
- ✅ Runs in headless mode (no display needed)
- ✅ Continues on error (won't fail the workflow if account creation fails)
- ✅ Uploads logs as artifacts (if logs directory exists)
- ✅ Caches npm dependencies for faster runs

### Monitoring

- Check the Actions tab to see workflow runs
- View logs for each run to see what happened
- Download artifacts to see detailed logs (if any)

### Notes

- Make sure your Cloudflare Worker is deployed and accessible
- The worker must have the `felo_accounts` table created
- Each run creates one account
- If you want to create multiple accounts per run, you'll need to modify the script or run multiple times

### Troubleshooting

If the workflow fails:

1. Check the workflow logs in the Actions tab
2. Verify all secrets are set correctly
3. Ensure the WORKER_URL is accessible
4. Check that the database migrations are applied
5. Verify testmail.app credentials are valid

