# Personal Notes AI Assistant with RAG

A complete full-stack **Personal Notes AI Assistant** app that allows users to write notes, automatically vectorizes their contents in real-time, and enables semantic chat questions based strictly on the saved notes using Retrieval-Augmented Generation (RAG).

---

## Technical Stack
* **Backend**: Node.js + Express
* **Database**: Neon Serverless PostgreSQL + `pgvector` extension
* **AI Engine**: OpenAI API (`text-embedding-3-small` for embeddings & `gpt-4o-mini` for chat responses)
* **Frontend**: React (Vite) + Tailwind CSS + Axios

---

## Project Structure
```
notes-ai/
├── backend/
│   ├── package.json              # Backend dependencies (Express, Neon Serverless client, OpenAI)
│   ├── index.js                  # Express API starter config
│   ├── .env.example              # Environment variables template
│   ├── db/
│   │   ├── schema.sql            # Postgres schemas (Users, Notes, Triggers, Vector HNSW index)
│   │   └── index.js              # Neon Serverless database initialization (ws setup)
│   ├── routes/
│   │   ├── notes.js              # CRUD notes endpoint generating text embeddings on write
│   │   └── ask.js                # RAG route matching query embedding with DB vectors
│   └── services/
│       └── openai.js             # OpenAI text-embedding-3-small & gpt-4o-mini client
└── frontend/
    ├── package.json              # React, Tailwind, and Axios dependencies
    ├── vite.config.js            # Configuration with dev proxy to port 3001
    ├── index.html                # Main entry document
    ├── tailwind.config.js        # Tailwind compiler setup
    ├── postcss.config.js         # PostCSS plugins config
    └── src/
        ├── main.jsx              # React bootstrap script
        ├── App.jsx               # Layout pane binding components
        ├── App.css               # Imports Tailwind utility directives
        └── components/
            ├── NotesList.jsx     # Searchable index of existing notes
            ├── NoteEditor.jsx    # Document editing pane with autosave alerts
            └── ChatBox.jsx       # LLM chat view rendering conversational RAG responses and sources
```

---

## Prerequisites
Before setting up the project, verify you have the following:
* **Node.js** (v18 or higher recommended)
* **Neon DB account** (serverless PostgreSQL instance with `pgvector` extension capabilities)
* **OpenAI API Key** (with access to `text-embedding-3-small` and `gpt-4o-mini` models)

---

## Setup Steps

### 1. Database Initialization
1. Log in to your [Neon Console](https://console.neon.tech).
2. Go to the **SQL Editor** tab of your project database.
3. Open and copy the contents of [schema.sql](file:///f:/personal%20assistant%20AI/notes-ai/backend/db/schema.sql) into the Neon SQL editor, then run it.
This will:
* Enable the `vector` extension.
* Create the `users` and `notes` tables.
* Setup automated `updated_at` timestamps using trigger functions.
* Create a high-performance HNSW vector search index.
* Seed a default user record.

### 2. Configure Environment Variables
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the `.env.example` file to create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
3. Open the newly created `backend/.env` file and configure it with your Neon connection URL and OpenAI credentials:
   * `PORT=3001`
   * `DATABASE_URL=postgresql://your_db_username:your_db_password@your_neon_host.neon.tech/neondb?sslmode=require`
   * `OPENAI_API_KEY=your_openai_api_key_here`
   * `DEFAULT_USER_ID=00000000-0000-0000-0000-000000000001`

### 3. Install Dependencies & Run

#### Run the Backend Server:
1. In your backend terminal window:
   ```bash
   npm install
   npm run dev
   ```
   The backend server will run on port `3001` with auto-reload enabled. Verify it starts and connects correctly.

#### Run the Frontend Application:
1. Open a new terminal window at the frontend folder root:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The frontend build server will start on port `3000`. Open your browser to `http://localhost:3000` to interact with the app.

---

## How to Use the App
1. **Create a Note**: Enter a title and text body in the **New Note** panel on the left and click **Save Note**.
2. **Review & Delete**: Newly saved notes are listed immediately under the **My Notes** list. Move your mouse cursor over any card to view dates and select the `×` delete trigger to remove a note.
3. **Conversational Search**: Type any questions referencing your notes in the right-side chat panel. The AI will retrieve the top 3 most semantically similar notes from your Neon database via pgvector, and feed them into the model context to generate a precise answer, citing the references in pills below.
