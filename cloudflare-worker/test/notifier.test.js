import assert from 'node:assert/strict';
import test from 'node:test';

import { Notifier, renderTemplate } from '../src/notifier.js';

test('renderTemplate 支持 {{message}} 和 $MSG', () => {
  assert.equal(renderTemplate('内容：{{message}}', { message: '测试' }), '内容：测试');
  assert.equal(renderTemplate('$MSG', { message: '测试' }), '测试');
});

test('custom webhook 发送通用 JSON 载荷', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('{}', { status: 200 });
  };
  const notifier = new Notifier({ webhook_url: 'https://hook.example/send', webhook_type: 'custom' }, fetcher, () => 123456);

  const result = await notifier.send('标题', '消息', 'critical');
  assert.equal(result.ok, true);
  assert.equal(calls[0].url, 'https://hook.example/send');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    title: '标题',
    message: '消息',
    level: 'critical',
    timestamp: 123456,
  });
});

test('pushplus webhook 发送 token/title/content/template', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('{"code":200}', { status: 200 });
  };
  const notifier = new Notifier({
    webhook_url: 'https://www.pushplus.plus/send',
    webhook_type: 'pushplus',
    pushplus_token: 'token-1',
  }, fetcher);

  const result = await notifier.send('Uptimer 告警', '服务器 DOWN', 'critical');
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    token: 'token-1',
    title: 'Uptimer 告警',
    content: '服务器 DOWN',
    template: 'txt',
  });
});
