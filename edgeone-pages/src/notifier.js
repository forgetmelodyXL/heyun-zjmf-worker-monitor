export function renderTemplate(template, vars) {
  const msg = String(vars.message ?? '');
  if (template === '$MSG') return msg;
  return template
    .split('$MSG')
    .join(msg)
    .replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, key) => String(vars[key.trim()] ?? ''));
}

function payloadFor(settings, title, message, level, nowSeconds) {
  if (settings.webhook_type === 'pushplus') {
    return {
      token: settings.pushplus_token,
      title,
      content: message,
      template: 'txt',
    };
  }
  return { title, message, level, timestamp: nowSeconds() };
}

export class Notifier {
  constructor(settings, fetcher = (input, init) => globalThis.fetch(input, init), nowSeconds = () => Math.floor(Date.now() / 1000)) {
    this.settings = settings;
    this.fetcher = fetcher;
    this.nowSeconds = nowSeconds;
  }

  async send(title, message, level = 'info') {
    if (!this.settings.webhook_url) return { ok: false, skipped: true };
    const response = await this.fetcher(this.settings.webhook_url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payloadFor(this.settings, title, message, level, this.nowSeconds)),
    });
    return { ok: response.ok, status: response.status };
  }
}
