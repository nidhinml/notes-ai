import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3001/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-secret-key': 'test' },
      body: JSON.stringify({ question: 'hello' })
    });
    
    console.log('Status:', res.status);
    
    const text = await res.text();
    console.log('Response body:', text);
  } catch(e) {
    console.error(e);
  }
}
run();
