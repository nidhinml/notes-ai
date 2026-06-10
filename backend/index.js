import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import notesRouter from './routes/notes.js';
import askRouter from './routes/ask.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS setup allowing all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/ask', askRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
