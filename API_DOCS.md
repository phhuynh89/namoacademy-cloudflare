# Custom API Service Documentation

## Overview

This API service provides endpoints for generating AI content including text, images, and videos. The service replaces GoogleGenAI SDK with a simplified, custom implementation.

## Base URL

The base URL is configurable via the `CUSTOM_API_BASE_URL` environment variable. Default: `/api`

```
Base URL: ${CUSTOM_API_BASE_URL || '/api'}
```

---

## Endpoints

### 1. Generate Content

Generate text or images based on prompts and optional image inputs.

**Endpoint:** `POST /generateContent`

#### Request Body

```json
{
  "model": "string",
  "parts": [
    {
      "text": "string (optional)",
      "inlineData": {
        "data": "string (base64 encoded image)",
        "mimeType": "string (e.g., 'image/jpeg', 'image/png')"
      }
    }
  ],
  "aspectRatio": "string (optional, e.g., '4:3', '16:9', '1:1')",
  "imageSize": "string (optional, e.g., '1K', '2K', '4K')"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model identifier (e.g., 'gemini-2.5-flash-image', 'gemini-3-flash-preview', 'gemini-3-pro-preview') |
| `parts` | array | Yes | Array of content parts (text and/or images) |
| `parts[].text` | string | No | Text prompt |
| `parts[].inlineData.data` | string | No | Base64 encoded image data |
| `parts[].inlineData.mimeType` | string | No | MIME type of the image (required if inlineData is provided) |
| `aspectRatio` | string | No | Image aspect ratio ('1:1', '4:3', '3:4', '16:9', '9:16') |
| `imageSize` | string | No | Image size ('1K', '2K', '4K') - only for certain models |

#### Response

**Success Response (200 OK):**

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "string (for text responses)",
            "inlineData": {
              "mimeType": "string",
              "data": "string (base64 encoded image)"
            }
          }
        ]
      }
    }
  ],
  "text": "string (extracted text from response, if available)"
}
```

#### Example Requests

**Text Generation:**
```json
{
  "model": "gemini-3-flash-preview",
  "parts": [
    {
      "text": "Describe this image in detail"
    },
    {
      "inlineData": {
        "data": "/9j/4AAQSkZJRgABAQAAAQ...",
        "mimeType": "image/jpeg"
      }
    }
  ]
}
```

**Image Generation:**
```json
{
  "model": "gemini-2.5-flash-image",
  "parts": [
    {
      "text": "A modern living room with minimalist design"
    }
  ],
  "aspectRatio": "16:9",
  "imageSize": "2K"
}
```

**Image Generation with Reference:**
```json
{
  "model": "gemini-2.5-flash-image",
  "parts": [
    {
      "inlineData": {
        "data": "/9j/4AAQSkZJRgABAQAAAQ...",
        "mimeType": "image/jpeg"
      }
    },
    {
      "inlineData": {
        "data": "/9j/4AAQSkZJRgABAQAAAQ...",
        "mimeType": "image/jpeg"
      }
    },
    {
      "text": "Transform this room to match the style of the reference image"
    }
  ],
  "aspectRatio": "4:3"
}
```

#### Supported Models

- `gemini-2.5-flash-image` - Fast image generation
- `gemini-3-flash-preview` - Fast text/image analysis
- `gemini-3-pro-preview` - Advanced text/image analysis

---

### 2. Generate Videos

Generate videos from an image and prompt. Returns an operation that can be polled for status.

**Endpoint:** `POST /generateVideos`

#### Request Body

```json
{
  "model": "string",
  "prompt": "string",
  "image": "string (base64 encoded image)",
  "mimeType": "string",
  "numberOfVideos": number
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Video model identifier (e.g., 'veo-3.1-fast-generate-preview') |
| `prompt` | string | Yes | Video generation prompt |
| `image` | string | Yes | Base64 encoded source image |
| `mimeType` | string | Yes | MIME type of the image (e.g., 'image/jpeg', 'image/png') |
| `numberOfVideos` | number | Yes | Number of videos to generate (typically 1) |

#### Response

**Success Response (200 OK):**

```json
{
  "done": false,
  "name": "string (operation identifier)",
  "response": {
    "generatedVideos": [
      {
        "video": {
          "uri": "string (download URL)"
        }
      }
    ]
  }
}
```

#### Example Request

```json
{
  "model": "veo-3.1-fast-generate-preview",
  "prompt": "Slow camera pan across the architectural scene, revealing details",
  "image": "/9j/4AAQSkZJRgABAQAAAQ...",
  "mimeType": "image/jpeg",
  "numberOfVideos": 1
}
```

#### Example Response

```json
{
  "done": false,
  "name": "operations/video-generation-12345",
  "response": null
}
```

**Note:** When `done` is `false`, poll the operation status using the `getVideosOperation` endpoint. When `done` is `true`, the `response.generatedVideos[0].video.uri` will contain the download URL.

---

### 3. Get Video Operation Status

Check the status of a video generation operation.

**Endpoint:** `GET /operations/{operationName}`

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operationName` | string | Yes | Operation identifier from the `generateVideos` response |

#### Response

**Success Response (200 OK):**

```json
{
  "done": boolean,
  "name": "string",
  "response": {
    "generatedVideos": [
      {
        "video": {
          "uri": "string (download URL when done is true)"
        }
      }
    ]
  }
}
```

#### Example Request

```
GET /api/operations/operations/video-generation-12345
```

#### Example Response (In Progress)

```json
{
  "done": false,
  "name": "operations/video-generation-12345",
  "response": null
}
```

#### Example Response (Completed)

```json
{
  "done": true,
  "name": "operations/video-generation-12345",
  "response": {
    "generatedVideos": [
      {
        "video": {
          "uri": "https://storage.googleapis.com/videos/video-12345.mp4"
        }
      }
    ]
  }
}
```

#### Polling Pattern

Video generation is asynchronous. Poll the operation status until `done` is `true`:

```javascript
let operation = await generateVideos(request);

while (!operation.done) {
  await sleep(10000); // Wait 10 seconds
  operation = await getVideosOperation({ operation });
}

// When done, download the video from operation.response.generatedVideos[0].video.uri
```

---

## Error Handling

All endpoints return standard HTTP status codes:

### Error Response Format

```json
{
  "error": {
    "message": "string",
    "code": "string (optional)",
    "details": "object (optional)"
  }
}
```

### Status Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Example Error Response

```json
{
  "error": {
    "message": "API request failed: 400 Bad Request - Invalid model specified",
    "code": "INVALID_MODEL"
  }
}
```

---

## Supported Aspect Ratios

- `1:1` - Square
- `4:3` - Standard (default)
- `3:4` - Portrait
- `16:9` - Widescreen
- `9:16` - Vertical/Story format

## Supported Image Sizes

- `1K` - 1024x1024 (or equivalent based on aspect ratio)
- `2K` - 2048x2048 (or equivalent based on aspect ratio)
- `4K` - 4096x4096 (or equivalent based on aspect ratio)

**Note:** Image size is only supported for certain models (e.g., `gemini-3-pro-image-preview`).

---

## Usage Examples

### JavaScript/TypeScript

```typescript
import { createCustomApiService } from './services/customApiService';

const apiService = createCustomApiService();

// Generate text
const textResponse = await apiService.generateContent({
  model: 'gemini-3-flash-preview',
  contents: {
    parts: [
      { text: 'What is artificial intelligence?' }
    ]
  }
});
console.log(textResponse.text);

// Generate image
const imageResponse = await apiService.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: {
    parts: [
      { text: 'A futuristic cityscape at sunset' }
    ]
  },
  config: {
    imageConfig: {
      aspectRatio: '16:9',
      imageSize: '2K'
    }
  }
});

// Generate video
const videoOperation = await apiService.generateVideos({
  model: 'veo-3.1-fast-generate-preview',
  prompt: 'Camera slowly moves through the scene',
  image: {
    imageBytes: base64ImageData,
    mimeType: 'image/jpeg'
  },
  config: {
    numberOfVideos: 1
  }
});

// Poll for completion
while (!videoOperation.done) {
  await new Promise(resolve => setTimeout(resolve, 10000));
  videoOperation = await apiService.getVideosOperation({
    operation: videoOperation
  });
}
```

### cURL Examples

**Generate Content:**
```bash
curl -X POST https://your-api.com/api/generateContent \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-2.5-flash-image",
    "parts": [
      {
        "text": "A beautiful sunset over mountains"
      }
    ],
    "aspectRatio": "16:9"
  }'
```

**Generate Videos:**
```bash
curl -X POST https://your-api.com/api/generateVideos \
  -H "Content-Type: application/json" \
  -d '{
    "model": "veo-3.1-fast-generate-preview",
    "prompt": "Slow pan across the scene",
    "image": "base64-encoded-image-data",
    "mimeType": "image/jpeg",
    "numberOfVideos": 1
  }'
```

**Get Operation Status:**
```bash
curl -X GET https://your-api.com/api/operations/operations/video-generation-12345 \
  -H "Content-Type: application/json"
```

---

## Rate Limits

Rate limits may apply depending on your API configuration. Check response headers for rate limit information:

- `X-RateLimit-Limit` - Maximum requests per time window
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Time when the rate limit resets

---

## Notes

1. **Base64 Encoding**: All image data must be base64 encoded without the data URI prefix (e.g., use `base64String` not `data:image/jpeg;base64,base64String`).

2. **Video Generation**: Video generation is asynchronous. Always poll the operation status until completion.

3. **Model Availability**: Not all models support all features. Check model-specific documentation for supported parameters.

4. **Image Size**: The `imageSize` parameter is only applicable to certain models. For other models, it will be ignored.

5. **Response Format**: The API returns responses in a format compatible with the original GoogleGenAI SDK structure for seamless integration.

---

## Support

For issues or questions, please refer to your API provider's documentation or support channels.

