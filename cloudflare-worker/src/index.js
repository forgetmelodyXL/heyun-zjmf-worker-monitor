import { runMonitorOnce } from './monitor.js';
import { D1Repository } from './repository.js';
import { handleRequest } from './routes.js';

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },

  async scheduled(_event, env, ctx) {
    const repo = new D1Repository(env.DB);
    const now = Math.floor(Date.now() / 1000);
    const today = new Date().toISOString().slice(0, 10);
    ctx.waitUntil(runMonitorOnce({ repo, fetcher: (input, init) => fetch(input, init), now, today }));
  },
};
