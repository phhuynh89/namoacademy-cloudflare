# Cloudflare Workers with D1 SQLite Database

A Cloudflare Workers project with D1 (SQLite) database integration.

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

**Note:** The migrations directory already contains `0001_initial.sql` with the initial schema.

## Development

Start the local development server:

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

## API Endpoints

- `GET /` or `GET /health` - Health check
- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item (body: `{ name: string, description?: string }`)
- `PUT /api/items/:id` - Update item (body: `{ name?: string, description?: string }`)
- `DELETE /api/items/:id` - Delete item

## Deployment

Deploy to Cloudflare:

```bash
npm run deploy
```

## Project Structure

```
.
├── src/
│   └── index.ts          # Main worker file
├── schema.sql            # Database schema
├── wrangler.toml         # Wrangler configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Notes

- The project uses Wrangler v3+ (not the deprecated v1.x)
- D1 database is bound as `DB` in the worker
- All endpoints include CORS headers for cross-origin requests
- The database schema includes a sample `items` table

