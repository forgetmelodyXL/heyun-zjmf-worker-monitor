import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advanceState,
  createRuntime,
  shouldReboot,
  applyRebootSuccess,
  shouldRunScheduledReboot,
} from '../src/state-machine.js';

test('异常达到阈值后从 healthy 推进到 down', () => {
  const settings = { suspect_threshold: 2, recover_timeout: 300 };
  let runtime = createRuntime({ now: 1000 });

  runtime = advanceState(runtime, false, settings, 1010);
  assert.equal(runtime.state, 'suspect');
  assert.equal(runtime.consecutive_failures, 1);

  runtime = advanceState(runtime, false, settings, 1020);
  assert.equal(runtime.state, 'down');
  assert.equal(runtime.consecutive_failures, 2);
});

test('恢复期检测正常会回到 healthy 并清理首次失败时间', () => {
  const settings = { suspect_threshold: 2, recover_timeout: 300 };
  const runtime = createRuntime({ state: 'recovering', first_failure_at: 1000 });

  const next = advanceState(runtime, true, settings, 1300);
  assert.equal(next.state, 'healthy');
  assert.equal(next.first_failure_at, 0);
  assert.equal(next.consecutive_failures, 0);
});

test('恢复超时会重新回到 down 并允许再次重启', () => {
  const settings = { suspect_threshold: 2, recover_timeout: 300 };
  const runtime = createRuntime({
    state: 'recovering',
    state_changed_at: 1000,
    last_reboot_time: 1000,
  });

  const next = advanceState(runtime, false, settings, 1401);
  assert.equal(next.state, 'down');
  assert.equal(next.last_reboot_time, 0);
});

test('down 状态满足冷却和每日限制时允许重启', () => {
  const runtime = createRuntime({
    state: 'down',
    last_reboot_time: 1000,
    reboot_count_today: 1,
    reboot_date: '2026-05-10',
  });
  const settings = { reboot_cooldown: 300, default_daily_reboot_limit: 3 };
  const server = { daily_reboot_limit: 0 };

  assert.equal(shouldReboot(runtime, server, settings, 1400, '2026-05-10'), true);
});

test('同日期重启成功会进入 recovering 并递增今日次数', () => {
  const runtime = createRuntime({ state: 'rebooting', reboot_count_today: 1, reboot_date: '2026-05-10' });

  const next = applyRebootSuccess(runtime, 2000, '2026-05-10');
  assert.equal(next.state, 'recovering');
  assert.equal(next.last_reboot_time, 2000);
  assert.equal(next.reboot_count_today, 2);
  assert.equal(next.reboot_date, '2026-05-10');
});

test('跨日期重启会重置今日次数后再计数', () => {
  const runtime = createRuntime({
    state: 'rebooting',
    reboot_count_today: 3,
    reboot_date: '2026-05-09',
  });

  const next = applyRebootSuccess(runtime, 2000, '2026-05-10');
  assert.equal(next.reboot_count_today, 1);
  assert.equal(next.reboot_date, '2026-05-10');
});

test('定时重启只在目标分钟触发一次', () => {
  const server = { scheduled_reboot: '04:00' };
  const runtime = createRuntime({ scheduled_reboot_date: '' });
  const settings = { check_interval: 300 };

  assert.equal(shouldRunScheduledReboot(runtime, server, settings, '2026-05-10T04:03:00+08:00'), true);
  assert.equal(
    shouldRunScheduledReboot({ ...runtime, scheduled_reboot_date: '2026-05-10:04:00' }, server, settings, '2026-05-10T04:03:00+08:00'),
    false,
  );
});
