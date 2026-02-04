# OpenCode Integration Design

Integration with OpenCode AI coding assistant.

## Overview

Llama Manager provides an OpenAI-compatible API that works with OpenCode's `@ai-sdk/openai-compatible` provider.

## Configuration

### Provider Setup

OpenCode uses `opencode.json` for provider configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "llama-manager": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Llama Manager",
      "options": {
        "baseURL": "http://localhost:5250/api/v1"
      },
      "models": {
        "model-id": {
          "name": "Model Display Name",
          "limit": {
            "context": 32768,
            "output": 4096
          }
        }
      }
    }
  }
}
```

### Self-Configuration Prompt

Users can paste this prompt into OpenCode to have it auto-configure:

```
Configure yourself to use my local Llama Manager as a provider. Create or update opencode.json with:
- Provider ID: "llama-manager"
- Use @ai-sdk/openai-compatible
- Base URL: http://localhost:5250/api/v1
- No API key needed (local server)

Then fetch the available models from http://localhost:5250/api/v1/models and add them to the config.
Set reasonable context limits based on the model names (32k for most, 128k for models with "128k" in name).
```

## API Compatibility

### Supported Endpoints

| Endpoint | Status |
|----------|--------|
| `GET /v1/models` | Supported |
| `POST /v1/chat/completions` | Supported |
| `POST /v1/completions` | Supported |
| `POST /v1/embeddings` | Supported |

### Streaming

Streaming is supported via Server-Sent Events (SSE) with `stream: true`.

### Authentication

No authentication required for local use. The API is designed for local development.

## Model Configuration

### Context Limits

Set `limit.context` based on the model's capabilities:

| Model Type | Typical Context |
|------------|-----------------|
| 7B-13B models | 8192 - 32768 |
| 30B+ models | 32768 - 65536 |
| 128k context models | 131072 |

### Output Limits

Set `limit.output` conservatively (4096 is usually sufficient) to avoid truncation.

## Troubleshooting

### Connection Refused

Ensure Llama Manager is running:
```bash
systemctl --user status llama-manager
```

### No Models Available

Check that models are loaded:
```bash
curl http://localhost:5250/api/v1/models
```

### Slow Responses

- Check GPU utilization in the dashboard
- Consider using a smaller model or quantization
- Ensure no other processes are using GPU memory

## References

- [OpenCode Providers Documentation](https://opencode.ai/docs/providers/)
- [AI SDK OpenAI Compatible](https://sdk.vercel.ai/providers/openai-compatible)
