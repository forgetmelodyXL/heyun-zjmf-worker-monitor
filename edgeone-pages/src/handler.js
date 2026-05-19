import net from 'node:net';

import { runMonitorOnce } from './monitor.js';
import { KVRepository } from './kv-repository.js';
import { handleRequest } from './routes.js';

function resolveKv(env = {}) {
  return env.ZJMF_KV || env.KV || env.EDGEONE_KV;
}

function nodeTcpConnector(host, port, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('TCP 连接超时'));
    }, timeout);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve(true);
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    });
  });
}

function buildEnv(env = {}) {
  const repo = new KVRepository(resolveKv(env));
  return {
    ...env,
    __repo: repo,
    tcpConnector: nodeTcpConnector,
    fetcher: env.fetcher || ((input, init) => fetch(input, init)),
  };
}

export async function handleEdgeOneRequest(request, env = {}) {
  return handleRequest(request, buildEnv(env));
}

export async function runEdgeOneMonitor(env = {}) {
  const edgeEnv = buildEnv(env);
  const now = Math.floor(Date.now() / 1000);
  return runMonitorOnce({
    repo: edgeEnv.__repo,
    fetcher: edgeEnv.fetcher,
    tcpConnector: nodeTcpConnector,
    now,
    force: true,
  });
}
