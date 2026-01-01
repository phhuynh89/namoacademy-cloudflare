# Felo Account Management API Documentation

## Overview

This API manages Felo accounts stored in the database. It provides endpoints for creating, retrieving, updating, and deleting Felo accounts, as well as managing authentication cookies.

## Database Schema

The `felo_accounts` table stores:
- `id`: Primary key (auto-increment)
- `email`: Account email address (unique)
- `password`: Account password
- `created_at`: Account creation timestamp
- `status`: Account status ('created' or 'failed')
- `error`: Error message (if status is 'failed')
- `login_at`: Last login timestamp
- `credits`: Account credits (default: 200)
- `felo_user_token`: Authentication cookie token (felo-user-token)
- `expire_date`: Cookie expiration date
- `last_used_at`: Timestamp when account was last selected (prevents duplicate selection)
- `updated_at`: Last update timestamp

## API Endpoints

### 1. Save Account

**Endpoint:** `POST /api/accounts/save`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "createdAt": "2024-01-15T10:00:00Z",
  "status": "created",
  "error": null,
  "loginAt": null,
  "credits": 200
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account saved successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Database error or duplicate email

**Note:** This endpoint is typically called by automated account creation scripts.

---

### 2. Get All Accounts

**Endpoint:** `GET /api/accounts`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "password": "password123",
    "created_at": "2024-01-15T10:00:00Z",
    "status": "created",
    "login_at": "2024-01-15T12:00:00Z",
    "credits": 200
  }
]
```

**Note:** Returns all accounts ordered by ID (newest first). Passwords are included in the response.

---

### 3. Get Account With Cookie

**Endpoint:** `GET /api/accounts/with-cookie`

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "password": "password123",
  "created_at": "2024-01-15T10:00:00Z",
  "status": "created",
  "error": null,
  "login_at": "2024-01-15T12:00:00Z",
  "credits": 200,
  "updated_at": "2024-01-15T12:00:00Z",
  "felo_user_token": "abc123xyz...",
  "expire_date": "2024-12-31T23:59:59Z",
  "last_used_at": "2024-01-15T12:05:00Z"
}
```

**Error Responses:**
- `404 Not Found`: No accounts found with valid (non-expired) cookie

**Note:** 
- Returns a single account (limit 1) that has a valid (non-expired) cookie
- Only returns accounts where `felo_user_token` is NOT NULL, `expire_date` is NOT NULL, and `expire_date` is in the future
- **Duplicate Prevention:** Excludes accounts used in the last 5 minutes to prevent duplicate selection when multiple requests come in simultaneously
- Orders by `last_used_at` (oldest first) to distribute load evenly across accounts
- Immediately marks the selected account as used (`last_used_at` is updated) to prevent concurrent requests from selecting the same account
- Includes all fields including cookie information and `last_used_at`

---

### 4. Get Account by ID

**Endpoint:** `GET /api/accounts/:id`

**URL Parameters:**
- `id`: Account ID (integer)

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "password": "password123",
  "created_at": "2024-01-15T10:00:00Z",
  "status": "created",
  "error": null,
  "login_at": "2024-01-15T12:00:00Z",
  "credits": 200,
  "updated_at": "2024-01-15T12:00:00Z",
  "felo_user_token": "abc123xyz...",
  "expire_date": "2024-12-31T23:59:59Z"
}
```

**Error Responses:**
- `404 Not Found`: Account not found

---

### 5. Get Accounts Without Cookie or Expired Cookie

**Endpoint:** `GET /api/accounts/without-cookie`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "password": "password123",
    "created_at": "2024-01-15T10:00:00Z",
    "status": "created",
    "error": null,
    "login_at": "2024-01-15T12:00:00Z",
    "credits": 200,
    "updated_at": "2024-01-15T12:00:00Z",
    "felo_user_token": null,
    "expire_date": null
  },
  {
    "id": 2,
    "email": "user2@example.com",
    "password": "password456",
    "created_at": "2024-01-14T10:00:00Z",
    "status": "created",
    "error": null,
    "login_at": "2024-01-14T12:00:00Z",
    "credits": 200,
    "updated_at": "2024-01-14T12:00:00Z",
    "felo_user_token": "expired-token",
    "expire_date": "2024-01-01T00:00:00Z"
  }
]
```

**Note:** 
- Returns accounts where `felo_user_token` is NULL, `expire_date` is NULL, or `expire_date` is in the past
- Limit is configurable via `ACCOUNTS_WITHOUT_COOKIE_LIMIT` environment variable (default: 5)
- Ordered by ID (newest first)
- Useful for finding accounts that need cookie refresh

---

### 6. Update Account Cookie

**Endpoint:** `PUT /api/accounts/:id/cookie`

**URL Parameters:**
- `id`: Account ID (integer)

**Request Body:**
```json
{
  "felo_user_token": "abc123xyz...",
  "expire_date": "2024-12-31T23:59:59Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cookie updated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing `felo_user_token` or `expire_date` in request body
- `404 Not Found`: Account not found
- `500 Internal Server Error`: Database error

**Note:** 
- Updates the `felo_user_token` and `expire_date` fields
- Automatically updates the `updated_at` timestamp
- Use ISO 8601 format for `expire_date` (e.g., "2024-12-31T23:59:59Z")

---

### 7. Delete Account

**Endpoint:** `DELETE /api/accounts/:id`

**URL Parameters:**
- `id`: Account ID (integer)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Error Responses:**
- `404 Not Found`: Account not found

---

## Usage Examples

### Save Account

```bash
curl -X POST https://your-worker.workers.dev/api/accounts/save \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "createdAt": "2024-01-15T10:00:00Z",
    "status": "created",
    "credits": 200
  }'
```

### Get All Accounts

```bash
curl https://your-worker.workers.dev/api/accounts
```

### Get Account With Cookie

```bash
curl https://your-worker.workers.dev/api/accounts/with-cookie
```

### Get Account by ID

```bash
curl https://your-worker.workers.dev/api/accounts/1
```

### Get Accounts Without Cookie

```bash
curl https://your-worker.workers.dev/api/accounts/without-cookie
```

### Update Account Cookie

```bash
curl -X PUT https://your-worker.workers.dev/api/accounts/1/cookie \
  -H "Content-Type: application/json" \
  -d '{
    "felo_user_token": "abc123xyz...",
    "expire_date": "2024-12-31T23:59:59Z"
  }'
```

### Delete Account

```bash
curl -X DELETE https://your-worker.workers.dev/api/accounts/1
```

---

## Cookie Management

The cookie management system tracks authentication tokens for Felo accounts:

- **felo_user_token**: The value of the `felo-user-token` cookie
- **expire_date**: When the cookie expires (ISO 8601 format)

### Workflow

1. **Find accounts needing cookie refresh:**
   ```bash
   GET /api/accounts/without-cookie
   ```

2. **Update cookie after authentication:**
   ```bash
   PUT /api/accounts/:id/cookie
   {
     "felo_user_token": "new-token-value",
     "expire_date": "2024-12-31T23:59:59Z"
   }
   ```

3. **Check account status:**
   ```bash
   GET /api/accounts/:id
   ```

---

## Error Handling

All endpoints return standard HTTP status codes:

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": "Error message here"
}
```

---

## Database Migration

To add the cookie columns to an existing database, run the migration:

```bash
# For local development
npm run db:migrate:local

# For production
npm run db:migrate
```

The migration files add:
- `0005_add_felo_cookie.sql`: 
  - `felo_user_token` column (TEXT, nullable)
  - `expire_date` column (DATETIME, nullable)
  - Index on `expire_date` for faster queries
- `0006_add_last_used_at.sql`:
  - `last_used_at` column (DATETIME, nullable)
  - Index on `last_used_at` for faster queries
  - Used to prevent duplicate account selection when multiple requests come in simultaneously

---

## Environment Variables

### ACCOUNTS_WITHOUT_COOKIE_LIMIT

Controls the maximum number of accounts returned by `GET /api/accounts/without-cookie`.

- **Type:** String (parsed as integer)
- **Default:** 5
- **Example:** `ACCOUNTS_WITHOUT_COOKIE_LIMIT=10`

To set in production:
```bash
wrangler secret put ACCOUNTS_WITHOUT_COOKIE_LIMIT
```

For local development, add to `.dev.vars`:
```
ACCOUNTS_WITHOUT_COOKIE_LIMIT=5
```

---

## Notes

- All endpoints include CORS headers for cross-origin requests
- Passwords are stored in plain text (consider encryption for production)
- Cookie expiration dates should be in ISO 8601 format (UTC)
- Account IDs are auto-incremented integers
- Email addresses must be unique

