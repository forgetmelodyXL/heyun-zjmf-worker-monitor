import assert from 'node:assert/strict';
import test from 'node:test';

import { checkHttpHealth, checkTcpHealth, statusMatches } from '../src/probe.js';

test('HTTP 检测在状态码匹配时判定在线', async () => {
  const result = await checkHttpHealth({
    server: { http_url: 'https://example.test/health', http_expected_status: '200-399', probe_timeout_ms: 1000 },
    fetcher: async (url) => new Response('ok', { status: String(url).includes('/health') ? 200 : 500 }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.statusValue, 'HTTP 200');
  assert.equal(result.error, '');
  assert.equal(Number.isFinite(result.latencyMs), true);
});

test('HTTP 检测在状态码不匹配时判定失败', async () => {
  const result = await checkHttpHealth({
    server: { http_url: 'https://example.test/health', http_expected_status: '200-299', probe_timeout_ms: 1000 },
    fetcher: async () => new Response('bad', { status: 503 }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusValue, 'HTTP 503');
  assert.match(result.error, /状态码不匹配/);
});

test('TCP 检测用连接器判断端口在线', async () => {
  const calls = [];
  const result = await checkTcpHealth({
    server: { tcp_host: 'tcp.example.test', tcp_port: 443, probe_timeout_ms: 1000 },
    connector: async (host, port) => {
      calls.push({ host, port });
      return true;
    },
  });

  assert.deepEqual(calls, [{ host: 'tcp.example.test', port: 443 }]);
  assert.equal(result.ok, true);
  assert.equal(result.statusValue, 'TCP 443 open');
});

test('状态码规则支持范围和逗号列表', () => {
  assert.equal(statusMatches(204, '200-299,301'), true);
  assert.equal(statusMatches(301, '200-299,301'), true);
  assert.equal(statusMatches(404, '200-299,301'), false);
});
