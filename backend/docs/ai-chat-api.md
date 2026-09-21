# Sprint 5 AI Municipal Chatbot API (S5-BE-02)

The AI Municipal Chatbot API provides authenticated citizens with interactive, grounded assistance regarding public services, civil registry procedures, business permit requirements, tax assessment, tourism, emergency contacts, and executive administration in the Municipality of Talibon, Bohol.

The endpoint uses `/api/chat`, Bearer authentication (Supabase auth JWT), API version 1 (`X-API-Version: 1`), and enforces strict per-client rate limits. OpenAPI documentation is served at `/api/openapi.json`.

---

## Endpoint Contract

### `POST /api/chat`

- **Authentication**: **Required** (`Authorization: Bearer <token>`). Anonymous calls receive `401 Unauthorized`.
- **Rate Limit**: Categorized under `AI_CHAT` (10 requests / minute per client). Calls exceeding this receive `429 Too Many Requests` with a `Retry-After` header.
- **Request Timeout**: Upstream provider calls time out after 15 seconds, returning `504 Gateway Timeout`.

#### Request Schema

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `message` | `string` | **Yes** | Citizen question or prompt (1-2000 characters). Must not be empty or whitespace only. |
| `conversationId` | `string` (UUID) | No | Optional conversation session identifier to correlate multi-turn exchanges. If omitted, a new UUID is generated and returned. |
| `history` | `Array<ChatMessage>` | No | Bounded historical conversation turns (maximum 10 items to prevent token inflation and prompt overflow). |

Each `ChatMessage` object in `history`:
- `role`: `'user' | 'assistant'`
- `content`: string (1-2000 characters)

#### Request Example

```http
POST /api/chat HTTP/1.1
Host: talibon.gov.ph
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Version: 1

{
  "message": "What are the requirements for applying for a new Business Permit in Talibon?",
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "history": [
    {
      "role": "user",
      "content": "Hello, I need help with my business."
    },
    {
      "role": "assistant",
      "content": "Hello! I would be glad to help you with your business registration or permit inquiries in Talibon. What specifically do you need?"
    }
  ]
}
```

#### Response Structure (`201 Created`)

```json
{
  "reply": "To apply for a new Business Permit in Talibon, Bohol, please prepare the following initial requirements:\n1. Barangay Business Clearance (from the barangay where your business is located)\n2. DTI Business Name Registration (for Sole Proprietorship) or SEC Registration (for Corporations/Partnerships)\n3. Occupancy Permit or Lease Contract (if renting)\n4. Fire Safety Inspection Certificate (from the BFP Talibon Fire Station)\n5. Sanitary Permit\n\nSubmit these to the Business Permits and Licensing Office (BPLO) at the Talibon Municipal Hall, Ground Floor, between 8:00 AM and 5:00 PM, Monday through Friday.",
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "sources": [
    "Business Permits & Licensing Office (BPLO)"
  ],
  "timestamp": "2026-09-21T15:30:00.000Z"
}
```

---

## Prompt & Response Architecture

### 1. Grounded Municipal System Prompt
The assistant operates with a strict system instruction providing authoritative facts about Talibon:
- Official office hours: Monday to Friday, 8:00 AM – 5:00 PM.
- Physical location: Municipal Hall, Poblacion, Talibon, Bohol.
- Department mapping: BPLO (Business Permits), MCR (Civil Registry), MSWDO (Indigency & Social Welfare), Treasury (Taxes & Cedula), MDRRMO (Disaster/Emergency).
- Language support: Bilingual English, Filipino/Tagalog, and Cebuano/Bisaya.

### 2. Guardrails & Safety Policy
- **Prompt Injection Defense**: The system prompt instructs the model to ignore user attempts to alter core system instructions, extract environment variables, or disclose secrets.
- **Sensitive Data Redaction**: The model is instructed never to output API keys, passwords, database URLs, or private administrative records.
- **Provider Error Masking**: Upstream errors from Google Gemini (or alternate LLM providers) are intercepted by the backend. Raw provider stack traces, quota messages, or error bodies are NEVER forwarded to the client. Responses always use standardized municipal error messages.
- **Credential Protection**: Server environment variables (`GEMINI_API_KEY`) remain strictly backend-side and are never injected into browser bundles or API responses.

---

## Frontend Integration Example (TypeScript / React)

```typescript
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
  sources: string[];
  timestamp: string;
}

export async function sendChatMessage(
  message: string,
  token: string,
  conversationId?: string,
  history?: ChatMessage[],
): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-Version': '1',
    },
    body: JSON.stringify({
      message,
      conversationId,
      history: history?.slice(-10),
    }),
  });

  if (res.status === 401) {
    throw new Error('Please log in to chat with the municipal assistant.');
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After') || '60';
    throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds before sending another message.`);
  }
  if (res.status === 504) {
    throw new Error('The assistant took too long to respond. Please try again in a moment.');
  }
  if (!res.ok) {
    throw new Error('The municipal AI assistant is temporarily unavailable.');
  }

  return res.json();
}
```

---

## Error Codes

- `400 Bad Request`: Validation failure (empty message, message exceeding 2000 characters, history exceeding 10 items, or invalid UUID).
- `401 Unauthorized`: Anonymous or unauthenticated request; missing/invalid Bearer token.
- `429 Too Many Requests`: Client exceeded 10 queries / minute. `Retry-After` header specifies cooldown in seconds.
- `502 Bad Gateway`: Upstream AI provider returned an error; sanitized without exposing provider details.
- `504 Gateway Timeout`: AI provider did not respond within the 15-second timeout window.

