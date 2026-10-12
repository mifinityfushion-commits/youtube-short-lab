import { MockLLMProvider, LocalStorage } from './adapters.js';
const llm = new MockLLMProvider();
const storage = new LocalStorage(process.env.STORAGE_DIR ?? './storage');
console.log('Short Lab worker ready in mock mode', await llm.generate({ task: 'health' }), storage.mode);
