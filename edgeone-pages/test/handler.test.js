import assert from 'node:assert/strict';
import test from 'node:test';

import { handleEdgeOneRequest } from '../src/handler.js';

class MemoryKV {
  constructor() {
    this.map = new Map();
  }

  async get(key) {
    return this.map.get(key) || null;
  }

  async put(key, value) {
    this.map.set(key, value);
  }
}

test('EdgeOne handler 渲染初始化页', async () => {
  const res = await handleEdgeOneRequest(new Request('https://edgeone.example/'), {
    ADMIN_TOKEN: 'admin',
    ZJMF_KV: new MemoryKV(),
  });
  const html = await res.text();

  assert.equal(res.status, 200);
  assert.match(html, /首次配置|管理面板/);
});

test('EdgeOne handler 使用 KV 管理接口', async () => {
  const kv = new MemoryKV();
  const env = { ADMIN_TOKEN: 'admin', ZJMF_KV: kv };
  const res = await handleEdgeOneRequest(new Request('https://edgeone.example/api/admin/settings', {
    method: 'POST',
    headers: {
      authorization: 'Bearer admin',
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ setup_completed: '1' }),
  }), env);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
});
