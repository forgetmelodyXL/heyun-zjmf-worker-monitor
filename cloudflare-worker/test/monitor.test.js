import assert from 'node:assert/strict';
import test from 'node:test';

import { runMonitorOnce } from '../src/monitor.js';

class FakeRepo {
  constructor(data) {
    this.data = data;
    this.saved = [];
    this.events = [];
    this.providers = [];
  }

  async getSettings() { return this.data.settings; }
  async listEnabledServers() { return this.data.servers; }
  async getProvider(name) { return this.data.providers[name]; }
  async updateProvider(provider) { this.providers.push({ ...provider }); }
  async getRuntime(id) { return this.data.runtimes[id]; }
  async saveRuntime(id, runtime) { this.data.runtimes[id] = runtime; this.saved.push({ id, runtime }); }
  async addEvent(event) { this.events.push(event); }
}

test('runMonitorOnce 将连续异常服务器推进到 down 并执行重启', async () => {
  const repo = new FakeRepo({
    settings: {
      suspect_threshold: 2,
      reboot_cooldown: 300,
      recover_timeout: 300,
      default_daily_reboot_limit: 3,
      api_timeout: 60,
    },
    providers: {
      heyun: { name: 'heyun', api_base_url: 'https://api.example/v1', jwt_token: 'jwt', jwt_expire_at: 9999 },
    },
    servers: [{ id: '4075', name: '测试机', provider: 'heyun', daily_reboot_limit: 0, scheduled_reboot: '' }],
    runtimes: {
      4075: {
        state: 'suspect',
        consecutive_failures: 1,
        consecutive_successes: 0,
        last_check_time: 0,
        last_reboot_time: 100,
        reboot_count_today: 0,
        reboot_date: '2026-05-10',
        last_status_value: '',
        state_changed_at: 1000,
        first_failure_at: 1000,
        reboot_initiated_at: 0,
        scheduled_reboot_date: '',
      },
    },
  });
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/status')) return new Response(JSON.stringify({ data: { status: 'off' } }));
    if (String(url).includes('/hard_reboot')) return new Response(JSON.stringify({ msg: '成功' }));
    return new Response(JSON.stringify({ jwt: 'jwt' }));
  };

  const summary = await runMonitorOnce({ repo, fetcher, now: 1400, today: '2026-05-10' });
  assert.equal(summary.checked, 1);
  assert.equal(repo.data.runtimes['4075'].state, 'recovering');
  assert.equal(repo.data.runtimes['4075'].reboot_count_today, 1);
  assert.equal(calls.some((c) => c.url.includes('/hard_reboot')), true);
  assert.equal(repo.events.some((event) => event.new_state === 'down'), true);
});
