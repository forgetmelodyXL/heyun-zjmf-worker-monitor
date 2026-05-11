function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fmtTime(seconds) {
  if (!seconds) return '从未';
  return new Date(seconds * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
}

function stateLabel(state) {
  const labels = {
    healthy: '运行正常',
    suspect: '疑似异常',
    down: '确认宕机',
    rebooting: '正在重启',
    recovering: '恢复中',
  };
  return labels[state] || '未知';
}

function isIpAddress(value) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(String(value || '').trim());
}

function displayName(server) {
  return isIpAddress(server.name) || isIpAddress(server.ip) ? `服务器 #${server.id}` : server.name;
}

function checkMethod(server) {
  const value = String(server.check_method || 'api_only').toLowerCase();
  if (value.includes('tcp')) return 'tcp';
  if (value.includes('http')) return 'http';
  return 'api';
}

function availability(server) {
  return (server.state || 'unknown') === 'healthy' ? '100.000%' : '0.000%';
}

function bars(server, count = 60) {
  const ok = (server.state || 'unknown') === 'healthy';
  return Array.from({ length: count }, (_, index) => {
    const tall = index > 42 ? 22 : 13 + (index % 4);
    return `<span class="${ok ? 'ok' : 'bad'}" style="height:${tall}px"></span>`;
  }).join('');
}

function latency(server) {
  const value = Number(server.last_latency_ms || server.latency_ms || 0);
  const text = value > 0 ? `${value}ms` : '-';
  return { best: text, avg: text, worst: text };
}

function row(server) {
  const state = server.state || 'unknown';
  const safeName = escapeHtml(displayName(server));
  const stats = latency(server);
  const method = checkMethod(server);
  return `<article class="status-card status-card--${state}">
    <div class="card-head">
      <div class="name-row"><span class="dot"></span><div><h2>${safeName}</h2><p>${method}</p></div></div>
      <div class="badges"><span class="uptime">● ${availability(server)}</span><span class="state">${stateLabel(state)}</span></div>
    </div>
    <p class="caption">近 30 天可用性</p>
    <div class="uptime-track"><span style="width:${availability(server)}"></span></div>
    <p class="caption">最近 60 次探测</p>
    <div class="probe-bars">${bars(server)}</div>
    <div class="card-foot"><span>最快 ${stats.best}</span><span>平均 ${stats.avg}</span><span>最慢 ${stats.worst}</span><span>${fmtTime(server.last_check_time).slice(-5)}</span></div>
    <div class="sr-meta">24 小时重启 ${server.reboot_count_today ?? 0} 次；最后重启 ${fmtTime(server.last_reboot_time)}</div>
  </article>`;
}

export function renderStatusPage(servers) {
  const healthy = servers.filter((s) => s.state === 'healthy').length;
  const problem = servers.length - healthy;
  const cards = servers.length ? servers.map(row).join('') : '<p class="empty">暂无启用的监控服务器。</p>';
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ZJMF 服务器监控</title>
  <style>
    :root{--bg:#0b1020;--panel:#1f2a3d;--ink:#f3f7ff;--muted:#88a0c2;--line:#31415c;--ok:#20d39b;--bad:#ff5d73;--warn:#fbbf24;--cyan:#38bdf8}
    *{box-sizing:border-box} body{margin:0;min-height:100vh;background:radial-gradient(circle at 18% 0,rgba(56,189,248,.14),transparent 30%),linear-gradient(180deg,#0b1020,#0d1426 68%,#08101f);color:var(--ink);font-family:"Bahnschrift","Aptos Display","Trebuchet MS",sans-serif}
    body:before{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(23,32,51,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(23,32,51,.055) 1px,transparent 1px);background-size:38px 38px;mask-image:linear-gradient(to bottom,#000,transparent 88%);pointer-events:none}
    main{position:relative;width:min(1120px,calc(100% - 36px));margin:0 auto;padding:54px 0}
    .pageNav{display:flex;justify-content:flex-end;margin-bottom:22px}.adminLink{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(23,32,51,.16);background:#111827;color:#fff;text-decoration:none;border-radius:16px;padding:13px 18px;font-weight:800;box-shadow:0 16px 38px rgba(23,32,51,.16)}
    .adminLink:before{content:"";width:8px;height:8px;border-radius:999px;background:#34d399;box-shadow:0 0 0 4px rgba(52,211,153,.18)}
    .hero{display:grid;grid-template-columns:1.4fr .8fr;gap:24px;align-items:end;margin-bottom:26px}
    .tag{display:inline-flex;gap:8px;align-items:center;color:var(--cyan);letter-spacing:.22em;font-size:12px;text-transform:uppercase}
    h1{font-size:clamp(36px,7vw,82px);line-height:.92;margin:14px 0 12px;letter-spacing:-.07em}
    .lead{color:var(--muted);font-size:17px;line-height:1.7;margin:0;max-width:640px}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .stat{padding:18px;border:1px solid var(--line);background:rgba(31,42,61,.82);backdrop-filter:blur(14px);border-radius:22px;box-shadow:0 14px 40px rgba(0,0,0,.2)}
    .stat b{display:block;font-size:30px}.stat span{color:var(--muted);font-size:13px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px}
    .status-card{border:1px solid var(--line);background:linear-gradient(180deg,rgba(31,42,61,.98),rgba(27,38,56,.98));box-shadow:0 26px 70px rgba(0,0,0,.25);border-radius:28px;padding:22px;animation:rise .5s ease both}
    .status-card--healthy{border-color:rgba(32,211,155,.24)}.status-card--down,.status-card--recovering,.status-card--rebooting{border-color:rgba(255,93,115,.42)}
    .card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.name-row{display:flex;gap:14px;align-items:flex-start}.dot{width:11px;height:11px;border-radius:99px;background:var(--ok);margin-top:9px;box-shadow:0 0 18px rgba(32,211,155,.75)}
    .status-card--down .dot,.status-card--rebooting .dot{background:var(--bad);box-shadow:0 0 18px rgba(255,93,115,.7)}h2{margin:0;font-size:26px}.name-row p{margin:3px 0 0;color:#b7c5dc}.badges{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.uptime,.state{border:1px solid rgba(32,211,155,.28);background:rgba(6,95,70,.25);color:#c9ffe9;border-radius:999px;padding:6px 12px;font-size:14px}
    .caption{color:var(--muted);margin:20px 0 10px}.uptime-track{height:32px;border-radius:8px;background:#34445c;overflow:hidden}.uptime-track span{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#1fcf96,#21d39b)}
    .probe-bars{height:34px;background:#34445c;border-radius:8px;padding:7px 6px;display:flex;gap:5px;align-items:end}.probe-bars span{display:block;width:7px;border-radius:2px}.probe-bars .ok{background:#16c98d}.probe-bars .bad{background:#ff5d73}.card-foot{display:flex;gap:18px;flex-wrap:wrap;color:#8fa7c8;margin-top:12px}.sr-meta{font-size:12px;color:#6f85a8;margin-top:10px}
    .metrics{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:24px 0 0}.metrics div{padding:14px;border-radius:18px;background:#172033}dt{color:var(--muted);font-size:12px}dd{margin:6px 0 0;font-weight:700;word-break:break-all}.empty{padding:28px;border:1px dashed var(--line);border-radius:22px;color:var(--muted)}
    footer{margin-top:26px;color:var(--muted);font-size:13px}.api{color:var(--cyan);text-decoration:none}
    @keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@media(max-width:760px){.hero{grid-template-columns:1fr}.summary{grid-template-columns:1fr 1fr}.metrics{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main>
    <nav class="pageNav"><a class="adminLink" href="/admin">管理面板</a></nav>
    <section class="hero">
      <div><span class="tag">ZJMF Monitor</span><h1>核云服务器<br>自动监控</h1><p class="lead">Cloudflare Worker 按探测间隔执行 API / HTTP(S) / TCP 检测；连续失败 3 次后确认异常并执行硬重启。</p></div>
      <div class="summary"><div class="stat"><b>${servers.length}</b><span>监控项</span></div><div class="stat"><b>${healthy}</b><span>正常</span></div><div class="stat"><b>${problem}</b><span>异常/恢复中</span></div></div>
    </section>
    <section class="grid">${cards}</section>
    <footer>数据接口：<a class="api" href="/api/status">/api/status</a></footer>
  </main>
</body>
</html>`;
}
