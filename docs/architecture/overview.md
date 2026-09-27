# Bob Research Intelligence: Architecture Overview

Bob is a personal, local-first research companion designed for fast retrieval, local SQLite persistence, and deep Claude-level reasoning.

```
                         ┌──────────────┐
                         │   BOB UI     │
                         └──────┬───────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ BOB ORCHESTRATOR│
                       └────────┬────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
   │ Context      │      │ Research     │      │ Tool         │
   │ Engine       │      │ Engine       │      │ Engine       │
   └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
          │                     │                     │
          ▼                     ▼                     ▼
   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
   │ Memory       │      │ Research     │      │ Web          │
   │ Engine       │      │ Knowledge    │      │ Files        │
   └──────┬───────┘      │ Graph        │      │ Browser      │
          │              └──────┬───────┘      └──────────────┘
          │                     │
          └─────────────────────┼─────────────────────┐
                                │                     │
                                ▼                     ▼
                         ┌──────────────┐       ┌──────────────┐
                         │ Gemini       │       │ Local SQLite │
                         │ AI           │       │              │
                         └──────────────┘       └──────────────┘
```

## Core Tenets
1. **Local-First Privacy**: Conversation messages, research findings, and memory never leave the user's computer.
2. **Relevance-Driven Context**: Context allocation is dynamic rather than rigid static quotas.
3. **Structured Knowledge Separation**: Raw chat messages are distinguished from structured claims and validated findings.
4. **Hands-Free Conversational Voice**: Real-time microphone capture with VAD, streaming text chunking, and instant barge-in interruption.
