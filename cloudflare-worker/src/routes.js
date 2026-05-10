import { runMonitorOnce } from './monitor.js';
import { D1Repository } from './repository.js';
import { renderStatusPage } from './status-page.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function isAuthorized(request, env) {
  const token = env.ADMIN_TOKEN || '';
  const header = request.headers.get('authorization') || '';
  return token && header === `Bearer ${token}`;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const repo = new D1Repository(env.DB);

  if ((url.pathname === '/' || url.pathname === '/status') && request.method === 'GET') {
    return new Response(renderStatusPage(await repo.listStatus()), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  if (url.pathname === '/api/status' && request.method === 'GET') {
    return json({ servers: await repo.listStatus() });
  }

  if (!url.pathname.startsWith('/api/admin/')) return json({ error: 'NOT_FOUND' }, 404);
  if (!isAuthorized(request, env)) return json({ error: 'UNAUTHORIZED' }, 401);

  if (url.pathname === '/api/admin/run' && request.method === 'POST') {
    const now = Math.floor(Date.now() / 1000);
    const today = new Date().toISOString().slice(0, 10);
    return json(await runMonitorOnce({ repo, fetcher: (input, init) => fetch(input, init), now, today }));
  }

  if (url.pathname === '/api/admin/providers' && request.method === 'POST') {
    const body = await readJson(request);
    if (!body?.name || !body?.api_base_url || !body?.api_account || !body?.api_password) {
      return json({ error: 'INVALID_PROVIDER' }, 400);
    }
    await repo.upsertProvider(body, Math.floor(Date.now() / 1000));
    return json({ ok: true });
  }

  if (url.pathname === '/api/admin/servers' && request.method === 'POST') {
    const body = await readJson(request);
    if (!body?.id || !body?.name || !body?.provider) return json({ error: 'INVALID_SERVER' }, 400);
    if (!(await repo.getProvider(body.provider))) return json({ error: 'PROVIDER_NOT_FOUND' }, 400);
    await repo.upsertServer(body, Math.floor(Date.now() / 1000));
    return json({ ok: true });
  }

  if (url.pathname === '/api/admin/settings' && request.method === 'POST') {
    const body = await readJson(request);
    if (!body || typeof body !== 'object') return json({ error: 'INVALID_SETTINGS' }, 400);
    for (const [key, value] of Object.entries(body)) await repo.setSetting(key, value);
    return json({ ok: true });
  }

  return json({ error: 'NOT_FOUND' }, 404);
}
