import express from 'express';
import askRouter from './routes/ask.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user_id = process.env.DEFAULT_USER_ID;
  req.secret_key = 'admin';
  next();
});
app.use('/api/ask', askRouter);

const server = app.listen(3005, async () => {
  console.log('Test server running on 3005');
  try {
    const res = await fetch('http://localhost:3005/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'hello' })
    });
    
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response body:', text);
  } catch(e) {
    console.error(e);
  } finally {
    server.close();
    process.exit(0);
  }
});
