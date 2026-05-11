export const STATES = Object.freeze({
  HEALTHY: 'healthy',
  SUSPECT: 'suspect',
  DOWN: 'down',
  REBOOTING: 'rebooting',
  RECOVERING: 'recovering',
});

export const DEFAULT_SETTINGS = Object.freeze({
  check_interval: 300,
  suspect_threshold: 3,
  reboot_cooldown: 600,
  recover_timeout: 300,
  recover_check_interval: 60,
  api_timeout: 60,
  default_daily_reboot_limit: 3,
  webhook_name: 'pushplus',
  webhook_url: '',
  webhook_type: 'custom',
  webhook_timeout: 10000,
  webhook_headers: '{\n  "Content-Type": "application/json"\n}',
  webhook_template: '{{message}}',
});

export const TRANSITION_LABELS = Object.freeze({
  'healthy:suspect': '检测异常',
  'suspect:down': '确认宕机',
  'suspect:healthy': '虚惊一场',
  'down:rebooting': '触发重启',
  'rebooting:recovering': '重启指令已发送',
  'recovering:healthy': '恢复成功',
  'recovering:down': '恢复超时',
});
