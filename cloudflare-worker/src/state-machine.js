import { STATES } from './constants.js';

export function createRuntime(overrides = {}) {
  const now = overrides.now ?? 0;
  return {
    state: overrides.state ?? STATES.HEALTHY,
    consecutive_failures: overrides.consecutive_failures ?? 0,
    consecutive_successes: overrides.consecutive_successes ?? 0,
    last_check_time: overrides.last_check_time ?? 0,
    last_reboot_time: overrides.last_reboot_time ?? 0,
    reboot_count_today: overrides.reboot_count_today ?? 0,
    reboot_date: overrides.reboot_date ?? '',
    last_status_value: overrides.last_status_value ?? '',
    state_changed_at: overrides.state_changed_at ?? now,
    first_failure_at: overrides.first_failure_at ?? 0,
    reboot_initiated_at: overrides.reboot_initiated_at ?? 0,
    scheduled_reboot_date: overrides.scheduled_reboot_date ?? '',
  };
}

function transition(runtime, state, now) {
  if (runtime.state === state) return runtime;
  return { ...runtime, state, state_changed_at: now };
}

export function advanceState(runtime, health, settings, now) {
  let next = { ...runtime, last_check_time: now };
  if (health === true) {
    next.consecutive_failures = 0;
    next.consecutive_successes += 1;
    if (next.state === STATES.SUSPECT || next.state === STATES.RECOVERING || next.state === STATES.REBOOTING) {
      next.first_failure_at = 0;
      return transition(next, STATES.HEALTHY, now);
    }
    if (next.state === STATES.DOWN) {
      next.consecutive_successes = 1;
      return transition(next, STATES.SUSPECT, now);
    }
    return next;
  }

  if (health === false) {
    next.consecutive_failures += 1;
    next.consecutive_successes = 0;
    if (next.first_failure_at === 0) next.first_failure_at = now;
    if (next.state === STATES.HEALTHY) return transition(next, STATES.SUSPECT, now);
    if (next.state === STATES.SUSPECT && next.consecutive_failures >= settings.suspect_threshold) {
      return transition(next, STATES.DOWN, now);
    }
    if (next.state === STATES.RECOVERING && now - next.state_changed_at > settings.recover_timeout) {
      next.last_reboot_time = 0;
      return transition(next, STATES.DOWN, now);
    }
  }

  return next;
}

export function shouldReboot(runtime, server, settings, now, today) {
  if (runtime.state !== STATES.DOWN) return false;
  if (now - runtime.last_reboot_time < settings.reboot_cooldown) return false;
  const count = runtime.reboot_date === today ? runtime.reboot_count_today : 0;
  const limit = server.daily_reboot_limit || settings.default_daily_reboot_limit;
  return limit <= 0 || count < limit;
}

export function applyRebootStart(runtime, now) {
  return transition(runtime, STATES.REBOOTING, now);
}

export function applyRebootSuccess(runtime, now, today) {
  const rebootCount = runtime.reboot_date === today ? runtime.reboot_count_today + 1 : 1;
  return transition(
    { ...runtime, last_reboot_time: now, reboot_initiated_at: now, reboot_count_today: rebootCount, reboot_date: today },
    STATES.RECOVERING,
    now,
  );
}

export function shouldRunScheduledReboot(runtime, server, settings, isoNow) {
  if (!server.scheduled_reboot) return false;
  const date = new Date(isoNow);
  const [hour, minute = '0'] = server.scheduled_reboot.split(':');
  const targetMinutes = Number(hour) * 60 + Number(minute);
  if (!Number.isFinite(targetMinutes)) return false;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const tolerance = Math.max(1, Math.floor(settings.check_interval / 60));
  const key = `${isoNow.slice(0, 10)}:${server.scheduled_reboot}`;
  return Math.abs(nowMinutes - targetMinutes) <= tolerance && runtime.scheduled_reboot_date !== key;
}

export function scheduledRebootKey(server, dateKey) {
  return `${dateKey}:${server.scheduled_reboot}`;
}

export function shouldRunScheduledRebootAt(runtime, server, settings, localParts) {
  if (!server.scheduled_reboot) return false;
  const [hour, minute = '0'] = server.scheduled_reboot.split(':');
  const targetMinutes = Number(hour) * 60 + Number(minute);
  if (!Number.isFinite(targetMinutes)) return false;
  const nowMinutes = localParts.hour * 60 + localParts.minute;
  const tolerance = Math.max(1, Math.floor(settings.check_interval / 60));
  const key = scheduledRebootKey(server, localParts.dateKey);
  return Math.abs(nowMinutes - targetMinutes) <= tolerance && runtime.scheduled_reboot_date !== key;
}
