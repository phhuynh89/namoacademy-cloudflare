# Cloudflare Workers with D1 Database and Account Creator

A Cloudflare Workers project with D1 (SQLite) database integration and automated account creation on felo.ai using Puppeteer and Browser Rendering API.

## Prerequisites

- Node.js 18+ and npm
- Cloudflare account
- Wrangler CLI (installed via npm)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Create D1 Database

Create a new D1 database:

```bash
npm run db:create
```

This will output a database ID. The `database_id` in `wrangler.toml` should already be updated, but if you create a new database, copy the ID and update it in `wrangler.toml`.

### 4. Initialize Database Schema

For local development, apply migrations to the local database:

```bash
npm run db:migrate:local
```

Alternatively, you can use the SQL file directly:

```bash
npm run db:local
```

For production/remote database, apply migrations:

```bash
npm run db:migrate
```

**Note:** The migrations directory contains:
- `0001_initial.sql` - Initial items table
- `0002_accounts.sql` - Felo accounts table for felo.ai accounts

## Development

### Running the Worker

Start the local development server:

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

### Running Account Creation (Local Puppeteer)

The account creation automation runs on your local machine using Puppeteer. **Make sure the worker is running first** (in a separate terminal), then:

```bash
npm run create-account
```

This will:
1. Launch a browser window on your local machine
2. Automate account creation on felo.ai
3. Save the account to Cloudflare D1 database via the Worker API

**Workflow:**
1. Terminal 1: `npm run dev` (starts the Worker)
2. Terminal 2: `npm run create-account` (runs Puppeteer automation)

## API Endpoints

### General
- `GET /` or `GET /health` - Health check

### Items API
- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item (body: `{ name: string, description?: string }`)
- `PUT /api/items/:id` - Update item (body: `{ name?: string, description?: string }`)
- `DELETE /api/items/:id` - Delete item

### Account Management API

See [ACCOUNT_API_DOCS.md](./ACCOUNT_API_DOCS.md) for complete documentation.

**Available Endpoints:**
- `POST /api/accounts/save` - Save account data to D1 database
- `GET /api/accounts` - Get all accounts
- `GET /api/accounts/with-cookie` - Get any single account with valid cookie (limit 1)
- `GET /api/accounts/:id` - Get account by ID
- `GET /api/accounts/without-cookie` - Get accounts without cookie or expired cookie (limit 100)
- `PUT /api/accounts/:id/cookie` - Update account cookie (felo_user_token and expire_date)
- `DELETE /api/accounts/:id` - Delete account

**Note:** Account creation is done via the local Puppeteer script (`npm run create-account`), not through the Worker API.

## Deployment

Deploy to Cloudflare:

```bash
npm run deploy
```

## Project Structure

```
.
├── src/
│   ├── index.ts                    # Main worker file (API endpoints)
│   └── local/
│       └── account-creator.ts     # Local Puppeteer script for account creation
├── migrations/
│   ├── 0001_initial.sql           # Initial items table
│   └── 0002_accounts.sql         # Accounts table
├── schema.sql                     # Database schema
├── wrangler.toml                  # Wrangler configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies and scripts
└── .dev.vars                      # Local environment variables
```

## Notes

- The project uses Wrangler v3+ (not the deprecated v1.x)
- D1 database is bound as `DB` in the worker for storing account data
- Puppeteer runs locally on your machine (not in the Worker)
- The local script (`src/local/account-creator.ts`) handles browser automation
- The Worker provides API endpoints to save accounts to D1
- All endpoints include CORS headers for cross-origin requests
- The database schema includes `items` and `felo_accounts` tables
- Account creation uses temporary email addresses from testmail.app service
- Puppeteer automation handles form filling and account creation on felo.ai
- All account data is stored in the D1 database via Worker API

## Local Puppeteer Setup

The account creation script uses regular Puppeteer running on your local machine:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Make sure the Worker is running:**
   ```bash
   npm run dev
   ```

3. **Run the account creation script:**
   ```bash
   npm run create-account
   ```

The script will:
- Launch a browser window on your machine
- Automate the account creation process
- Save the account to D1 via the Worker API

**Note:** Make sure you have Chrome/Chromium installed for Puppeteer to work.

## GitHub Actions Automation

You can automate account creation using GitHub Actions. The workflow is configured to run on a schedule.

### Setup GitHub Actions

1. **Add GitHub Secrets** (Repository → Settings → Secrets and variables → Actions):
   - `WORKER_URL` - Your deployed Cloudflare Worker URL
   - `ACCOUNTS_PER_RUN` (optional) - Number of accounts to create per run (default: 1)

2. **Configure Schedule** (optional):
   Edit `.github/workflows/create-account.yml` to change the cron schedule:
   ```yaml
   schedule:
     - cron: '*/5 * * * *'  # Every 5 minutes (minimum allowed by GitHub Actions)
   ```
   **Note:** GitHub Actions has a minimum interval of 5 minutes. Schedules use UTC time.

3. **Manual Trigger**:
   - Go to Actions tab → "Create Felo Account" → "Run workflow"

The workflow will:
- Run Puppeteer in headless mode
- Create accounts automatically
- Upload logs as artifacts
- Continue on errors (won't fail the workflow)

See `.github/workflows/README.md` for more details.

