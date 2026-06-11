# Notes AI: System Architecture & RAG Workflow

This document details the system design, components, and workflow of the Retrieval-Augmented Generation (RAG) implementation in **Notes AI**.

---

## 1. System Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────────┐
   │                       REACT CLIENT                          │
   │   - Interactive Chat & Note Panel   - Theme Management      │
   └───────────────┬─────────────────────────────▲───────────────┘
     1. User Query │ (HTTP POST)                 │ 7. Answer & Sources
                   ▼                             │
   ┌─────────────────────────────────────────────┴───────────────┐
   │                      EXPRESS BACKEND                        │
   │   - Route Authentication            - Context Builder       │
   └───────────────┬─────────────────────────────▲───────────────┘
     2. Hash Text  │                             │ 5. Structured Context
                   ▼                             │
   ┌───────────────────────────────┐   ┌─────────┴───────────────┐
   │         MOCK EMBEDDER         │   │   DEEPSEEK CHAT API     │
   │  1536-Dimension Vector Gen    │   │  Answer Composition     │
   └───────────────┬───────────────┘   └─────────────────────────┘
     3. Search     │ (Cosine Distance <=> )
                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                    NEON VECTOR DATABASE                     │
   │   - users, notes tables             - pgvector HNSW Index   │
   └─────────────────────────────────────────────────────────────┘
```

* **Frontend**: React (Vite), Vanilla CSS (responsive, dark/light variables), Axios (auth tokens).
* **Backend**: Node.js, Express.js.
* **Database**: Neon Serverless PostgreSQL with `pgvector` extension and HNSW cosine index.
* **Models**: `deepseek-chat` (generation) & Offline LCG Vector Engine (embeddings generator).

---

## 2. Core Concepts: Embeddings & Vector Databases

### What is an Embedding?
An **Embedding** is a mathematical representation of text converted into a list of numbers (a vector). The **Offline LCG Engine** translates text chunks into a 1536-dimensional normalized vector where contextually similar texts have similar vector directions (close angles).

### What does the Vector Database do?
The **Vector Database** stores these 1536-dimensional vectors side-by-side with your note records. When a query is run, it performs mathematical calculations using the `pgvector` operator (`<=>` for cosine distance) to return notes whose vector angles align closest with the question vector.

---

## 3. Step-by-Step RAG Prompt Workflow

1. **Prompt Entry**: The user asks a question (e.g., *"What were the key takeaways from yesterday's meeting?"*).
2. **Embedding Creation**: The backend generates a 1536-dimensional vector embedding of the user's question.
3. **Database Query**: The database performs a semantic query comparing the question vector against the user's stored notes using `pgvector` cosine similarity.
4. **Hybrid Retrieval Fallback**:
   - If time-based words (e.g. *recent, summarize*) are matched, notes are sorted by date.
   - If key terms (e.g. *meeting, task, todo*) are found, matching text elements are automatically pulled and merged.
5. **Context Insertion**: The top 5 matched notes are formatted into a system prompt injection template:
   ```text
   System: You are an assistant. Answer the question using ONLY the context notes below:
   [Retrieved Note Context 1]
   [Retrieved Note Context 2]
   User: What were the key takeaways from yesterday's meeting?
   ```
6. **LLM Generation**: The prompt is processed by the **DeepSeek Chat API** (`deepseek-chat` model) to construct a factual, context-aware answer.
7. **Frontend Render**: The client receives the generated response and prints it alongside **📄 source attribution tags** linking to the relevant note records.
