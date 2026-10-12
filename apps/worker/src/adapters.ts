import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { LLMProvider, Storage } from '@shortlab/shared';
export class MockLLMProvider implements LLMProvider { async generate({task}:{task:string}) { return {text:`[Mock] Resultaat voor ${task}`,source:'mock' as const}; } }
export class LocalStorage implements Storage {
  readonly mode = 'local';
  constructor(private readonly root:string) {}
  async put(key:string,body:Uint8Array,contentType:string) { const path=join(this.root,key); await mkdir(dirname(path),{recursive:true}); await writeFile(path,body); return {key,url:`file://${path}?contentType=${encodeURIComponent(contentType)}`}; }
}
