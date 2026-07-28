import { askLLM } from './services/openai.js';

async function run() {
  try {
    const stream = await askLLM("say hi", [], true);
    for await (const chunk of stream) {
      console.log(JSON.stringify(chunk));
    }
  } catch(e) {
    console.error(e);
  }
}
run();
