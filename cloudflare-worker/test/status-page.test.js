import assert from 'node:assert/strict';
import test from 'node:test';

import { renderStatusPage } from '../src/status-page.js';

test('状态页渲染服务器状态并转义 HTML', () => {
  const html = renderStatusPage([
    {
      id: '8564',
      name: '<script>alert(1)</script>',
      provider: 'heyunidc',
      state: 'healthy',
      last_status_value: 'on',
      last_check_time: 1778384953,
      last_reboot_time: 0,
      reboot_count_today: 0,
      check_method: 'tcp',
    },
  ]);

  assert.match(html, /ZJMF 服务器监控/);
  assert.match(html, /--bg:#0b1020/);
  assert.match(html, /status-card/);
  assert.match(html, /近 30 天可用性/);
  assert.match(html, /最近 60 次探测/);
  assert.match(html, /tcp/);
  assert.match(html, /管理面板/);
  assert.match(html, /href="\/admin"/);
  assert.match(html, /运行正常/);
  assert.match(html, /24 小时重启/);
  assert.doesNotMatch(html, /本小时重启|今日重启/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

test('状态页不显示服务器 IP，名称为 IP 时改用泛化名称', () => {
  const html = renderStatusPage([
    {
      id: '8564',
      name: '203.0.113.10',
      ip: '203.0.113.10',
      provider: 'heyunidc',
      state: 'healthy',
      last_status_value: 'on',
      last_check_time: 1778384953,
      last_reboot_time: 0,
      reboot_count_today: 0,
    },
  ]);

  assert.match(html, /服务器 #8564/);
  assert.doesNotMatch(html, /203\.0\.113\.10/);
});
