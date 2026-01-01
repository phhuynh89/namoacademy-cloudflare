# Boomlify API Key Management Documentation

## Overview

This worker manages Boomlify API keys with a daily credit system. Each API key starts with 50 credits per day, and credits are automatically reset every 24 hours. Each temp mail request deducts 1 credit.

## Database Schema

The `boomlify_api_keys` table stores:
- `id`: Primary key
- `api_key`: Unique Boomlify API key
- `name`: Optional name for the API key
- `credits`: Current credit balance (default: 50)
- `last_reset`: Timestamp of last credit reset
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## API Endpoints

### 1. List All API Keys

**Endpoint:** `GET /api/boomlify/keys`

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "api_key": "your-boomlify-api-key",
      "name": "My API Key",
      "credits": 45,
      "last_reset": "2024-01-15T00:00:00Z",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T12:30:00Z"
    }
  ]
}
```

### 2. Create New API Key

**Endpoint:** `POST /api/boomlify/keys`

**Request Body:**
```json
{
  "api_key": "your-boomlify-api-key",
  "name": "Optional name for this key"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "api_key": "your-boomlify-api-key",
  "name": "Optional name for this key",
  "credits": 50,
  "last_reset": "2024-01-15T12:00:00Z",
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing `api_key` in request body
- `409 Conflict`: API key already exists

### 3. Get Temp Mail

**Endpoint:** `POST /api/boomlify/temp-mail`

**Request Body:**
```json
{}
```
*No body required - API key is automatically selected from database*

**Response (200 OK):**
```json
{
  "email": "temp-email@example.com",
  "id": "mailbox-id",
  "expires_at": "2024-01-15T12:10:00Z",
  "api_key_id": 1,
  "credits_remaining": 49
}
```

**Error Responses:**
- `503 Service Unavailable`: No available API keys with credits > 0
- `500 Internal Server Error`: Boomlify API error or other server error

**Note:** This endpoint automatically:
- Selects an API key from the database that has credits > 0
- Checks if credits need to be reset (24 hours passed) before selection
- Deducts 1 credit after successful temp mail creation
- Returns the remaining credits and API key ID in the response

### 4. Check Credits

**Endpoint:** `GET /api/boomlify/keys/:id/credits`

**Response (200 OK):**
```json
{
  "id": 1,
  "credits": 45,
  "last_reset": "2024-01-15T00:00:00Z",
  "next_reset": "2024-01-16T00:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: API key not found

**Note:** This endpoint automatically checks if credits need to be reset and updates them if 24 hours have passed.

### 5. Manual Credit Reset

**Endpoint:** `POST /api/boomlify/keys/:id/reset`

**Response (200 OK):**
```json
{
  "message": "Credits reset successfully",
  "credits": 50
}
```

**Error Responses:**
- `404 Not Found`: API key not found

## Credit Reset

Credits can be manually reset using the `POST /api/boomlify/keys/:id/reset` endpoint. The system also automatically checks and resets credits when checking credit status or selecting an API key for use (if 24 hours have passed since the last reset).

## Credit System

- **Initial Credits:** 50 credits per API key
- **Credit Cost:** 1 credit per temp mail request
- **Reset Frequency:** Every 24 hours (automatic)
- **Reset Time:** Based on `last_reset` timestamp (individual per key)

## Usage Examples

### Create an API Key

```bash
curl -X POST https://your-worker.workers.dev/api/boomlify/keys \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your-boomlify-api-key",
    "name": "Production Key"
  }'
```

### Get Temp Mail

```bash
# No API key required - automatically selects from database
curl -X POST https://your-worker.workers.dev/api/boomlify/temp-mail \
  -H "Content-Type: application/json"
```

### Check Credits

```bash
curl https://your-worker.workers.dev/api/boomlify/keys/1/credits
```

### List All Keys

```bash
curl https://your-worker.workers.dev/api/boomlify/keys
```

## Setup Instructions

1. **Run the migration:**
   ```bash
   npm run db:migrate:local  # For local development
   npm run db:migrate        # For production
   ```

2. **Deploy the worker:**
   ```bash
   npm run deploy
   ```

3. **Create your first API key:**
   Use the `POST /api/boomlify/keys` endpoint with your Boomlify API key.

## Notes

- Credits are checked and reset automatically on each request if 24 hours have passed
- Each temp mail request costs exactly 1 credit
- If credits are insufficient, the request will fail with a 503 status code
- Manual credit reset is available via the `POST /api/boomlify/keys/:id/reset` endpoint

