# API Documentation Enhancements

Improvements to the existing API Docs page.

## Motivation

The current API Docs page allows testing endpoints but lacks:
- curl examples for copying
- Model dropdown for OpenAI endpoints
- Better usability for common tasks

## User Stories

- As a developer, I want to copy curl commands for API endpoints
- As a user, I want to select loaded models from a dropdown instead of typing IDs

## Design

### Overview

Enhance the existing ApiDocsPage with curl command generation and model selection.

### Features

1. **curl Examples**
   - Auto-generate curl command based on endpoint and parameters
   - Display below parameter form
   - Update as parameters change
   - Copy button

2. **Model Dropdown**
   - For OpenAI tab endpoints
   - Fetch models from `/api/v1/models` when tab active
   - Replace text input for `model` field
   - Show model IDs from loaded models

### UI Changes

```
┌─────────────────────────────────────────────────────────────┐
│ Parameters                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ model: [Dropdown: model-1 ▼]                            │ │
│ │ messages: [textarea]                                    │ │
│ │ temperature: [0.7]                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ curl Example                                        [Copy]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ curl -X POST http://localhost:3001/api/v1/chat/...     │ │
│ │   -H "Content-Type: application/json" \                │ │
│ │   -d '{"model": "model-1", ...}'                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Send Request]                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Details

**generateCurlExample function:**
```javascript
function generateCurlExample(endpoint, params) {
  const baseUrl = window.location.origin;
  let url = baseUrl + endpoint.path;

  // Handle path params
  for (const param of endpoint.params) {
    if (param.type === 'path' && params[param.name]) {
      url = url.replace(`:${param.name}`, params[param.name]);
    }
  }

  // Handle query params
  const queryParams = endpoint.params
    .filter(p => p.type === 'query' && params[p.name])
    .map(p => `${p.name}=${encodeURIComponent(params[p.name])}`);
  if (queryParams.length) url += '?' + queryParams.join('&');

  // Build curl command
  let curl = `curl -X ${endpoint.method} "${url}"`;

  if (endpoint.method !== 'GET') {
    curl += ` \\\n  -H "Content-Type: application/json"`;

    const bodyParams = {};
    for (const param of endpoint.params) {
      if (!['path', 'query'].includes(param.type) && params[param.name] !== undefined) {
        bodyParams[param.name] = params[param.name];
      }
    }

    if (Object.keys(bodyParams).length) {
      curl += ` \\\n  -d '${JSON.stringify(bodyParams)}'`;
    }
  }

  return curl;
}
```

**Model Dropdown:**
- State: `openaiModels` array
- Fetch on OpenAI tab activation
- Render dropdown instead of text input for model param

## Files to Modify

- `ui/src/App.jsx` - Update ApiDocsPage component
- `ui/src/App.css` - Add curl section styles

### CSS Classes

```css
.curl-section
.curl-section h4
.curl-code-container
.curl-code
.curl-copy-btn
```

## Testing

### Manual Testing

1. Go to API Docs page
2. Select an endpoint with parameters
3. Fill in parameters
4. Verify curl example updates dynamically
5. Click copy button, paste to verify
6. Switch to OpenAI tab
7. Select chat/completions endpoint
8. Verify model dropdown shows loaded models
9. Test endpoint, verify it works

### Edge Cases

- No models loaded: Show text input fallback
- Special characters in params: Proper escaping
- Long curl commands: Horizontal scroll
