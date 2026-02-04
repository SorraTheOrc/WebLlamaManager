# Chat Page Design

Full-featured chat interface for interacting with loaded models.

## Motivation

The existing QueryPanel provides basic chat functionality but lacks:
- Conversation history persistence
- Multiple conversation support
- Image input for vision models
- Dedicated full-page experience

## User Stories

- As a user, I want to have multiple conversations so I can organize different topics
- As a user, I want my conversations to persist across sessions
- As a user, I want to upload images to use with vision models
- As a user, I want to see generation statistics for each response

## Design

### Overview

A full-page chat interface with conversation management sidebar and rich chat experience.

### UI/UX

**Route:** `/chat`

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar (280px)        │ Main Chat Area                      │
│ ┌────────────────────┐ │ ┌──────────────────────────────────┐│
│ │ + New Chat         │ │ │ Header: Model Select  [Clear]   ││
│ ├────────────────────┤ │ ├──────────────────────────────────┤│
│ │ Conversation 1     │ │ │                                  ││
│ │ Conversation 2  ✕  │ │ │      Message History             ││
│ │ Conversation 3     │ │ │      (auto-scroll)               ││
│ │                    │ │ │                                  ││
│ │                    │ │ │  [stats tooltip on hover]        ││
│ │                    │ │ ├──────────────────────────────────┤│
│ │                    │ │ │ [📎] [image preview] [input] [→] ││
│ └────────────────────┘ │ └──────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

**Sidebar:**
- New conversation button
- List of conversations with title and timestamp
- Delete button on hover
- Active conversation highlighted

**Chat Area:**
- Model selection dropdown (populated from loaded models)
- Clear conversation button
- Message history with user/assistant styling
- Stats tooltip on hover for assistant messages
- Image upload button with preview
- Text input with Enter to send

### Data Model

```typescript
interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | ContentPart[];
  stats?: MessageStats;
  timestamp: string;
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string }; // base64 data URL
}

interface MessageStats {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  tokensPerSecond: number;
  duration: number;
}
```

### State Management

- **Conversations**: Persisted to localStorage
- **Current conversation**: React state
- **Model selection**: Per-conversation, saved with conversation
- **Pending images**: Temporary state before sending

### Features

1. **Multiple Conversations**
   - Create new conversations
   - Switch between conversations
   - Delete conversations
   - Auto-generate title from first user message

2. **Streaming Responses**
   - Reuse SSE pattern from QueryPanel
   - Show typing indicator during streaming
   - Display stats after completion

3. **Image Input**
   - File picker for images
   - Preview before sending
   - Send as multimodal content
   - Support for vision models

4. **Message Actions**
   - Copy message content
   - Stats tooltip on hover

## Implementation

### Files to Modify

- `ui/src/App.jsx` - Add ChatPage component, update routes and sidebar
- `ui/src/App.css` - Add chat page styles

### CSS Classes

```css
.chat-page
.chat-layout
.chat-sidebar
.chat-sidebar-header
.conversation-list
.conversation-item
.conversation-item.active
.conv-title
.conv-meta
.conv-delete
.chat-main
.chat-header
.chat-messages
.chat-message
.chat-message.user
.chat-message.assistant
.message-content
.message-image
.chat-input-area
.pending-images
.pending-image
.chat-input
.chat-empty
```

## Testing

### Manual Testing

1. Navigate to /chat
2. Create new conversation
3. Send message, verify streaming response
4. Verify stats tooltip on hover
5. Upload image, verify preview
6. Send image message (with vision model)
7. Create second conversation
8. Switch between conversations
9. Delete a conversation
10. Refresh page, verify persistence

### Edge Cases

- No models loaded: Show helpful message
- Image upload with non-vision model: Send as text-only
- Very long conversations: Virtual scrolling (future)
- Network errors: Show error in chat
