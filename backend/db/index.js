import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Configure Neon to use the ws module for WebSockets in Node.js environments
neonConfig.webSocketConstructor = ws;

const sql = neon(process.env.DATABASE_URL);

export default sql;
