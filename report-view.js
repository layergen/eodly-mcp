// Self-contained MCP Apps view (MIME text/html;profile=mcp-app) for Eodly reports.
// When an agent calls list_reports or get_report on the Eodly MCP server, an MCP Apps
// host (Claude, ChatGPT, VS Code, ...) renders this HTML inline in the conversation and
// delivers the tool result to it. It implements the MCP Apps client bridge (ext-apps /
// SEP-1865, spec 2026-01-26): it posts a ui/initialize handshake to the host, announces
// ui/notifications/initialized, then renders whatever arrives on
// ui/notifications/tool-result. It is fully self-contained (inline CSS + JS, no network,
// no external assets), so it needs no CSP allowances and works under the host's default
// restrictive policy. Kept as a string constant so the esbuild-bundled api function has
// no runtime file reads. The inline script uses single quotes and no backslashes so it
// embeds safely inside this template literal.
export const REPORT_VIEW_URI = 'ui://eodly/report.html'
export const REPORT_VIEW_MIME = 'text/html;profile=mcp-app'

export const REPORT_VIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<!-- The view is self-contained, so everything is locked down except the inline style and
     script it ships with. frame-ancestors names the two hosts that embed MCP App views. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src https://eodly.io; form-action 'none'; base-uri 'none'; frame-ancestors https://chatgpt.com https://claude.ai" />
<title>Eodly report</title>
<style>
  :root{
    --bg:#ffffff; --surface:#faf9f6; --ink:#141413; --muted:#6b6b66; --line:#e7e5df;
    --accent:#d85a30; --ship:#2f9e44; --slip:#d64545; --silent:#9a978f;
    --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,'SF Mono',Menlo,monospace;
  }
  :root[data-theme="dark"]{ --bg:#1a1a19; --surface:#232320; --ink:#f5f4f0; --muted:#a5a29a; --line:#33322e; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; }
  body{ font-family:var(--sans); background:var(--bg); color:var(--ink); line-height:1.5; padding:16px; -webkit-font-smoothing:antialiased; }
  .card{ max-width:640px; margin:0 auto; }
  .head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .brand{ font-weight:800; letter-spacing:-.02em; font-size:17px; }
  .brand .dot{ color:var(--accent); }
  .kicker{ font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
  .headline{ font-size:19px; font-weight:700; letter-spacing:-.01em; margin:2px 0 12px; }
  .sect{ font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin:14px 0 6px; }
  .row{ display:flex; gap:10px; padding:11px 12px; background:var(--surface); border:1px solid var(--line); border-radius:10px; margin-bottom:8px; }
  .dot2{ width:10px; height:10px; border-radius:50%; margin-top:5px; flex:0 0 auto; }
  .ship{ background:var(--ship); } .slip{ background:var(--slip); } .silent{ background:var(--silent); } .neutral{ background:var(--accent); }
  .r-name{ font-weight:650; font-size:14px; }
  .r-tag{ font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; margin-left:6px; }
  .r-detail{ font-size:13px; color:var(--muted); margin-top:2px; }
  .empty{ color:var(--muted); font-size:14px; text-align:center; padding:26px 0; }
  .foot{ font-size:11px; color:var(--muted); margin-top:12px; }
  pre{ white-space:pre-wrap; font:12px/1.5 var(--mono); color:var(--muted); background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:12px; overflow-x:auto; }
</style>
</head>
<body>
<div class="card" id="card">
  <div class="head">
    <span class="brand">eodly<span class="dot">.</span></span>
    <span class="kicker" id="kicker"></span>
  </div>
  <div id="content"><div class="empty">Waiting for the report&hellip;</div></div>
  <div class="foot">Sourced end-of-day report, rendered by Eodly.</div>
</div>
<script>
(function(){
  'use strict';
  var PROTOCOL = '2026-01-26';
  var reqId = 1;
  function post(msg){ msg.jsonrpc = '2.0'; parent.postMessage(msg, '*'); }
  function notify(method, params){ post({ method: method, params: params || {} }); }
  function el(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]; }); }
  function setTheme(t){ document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light'); }
  function when(v){ if(!v) return ''; try { return new Date(v).toLocaleString(); } catch(e){ return String(v); } }
  function reportHeight(){ var h = Math.ceil(el('card').getBoundingClientRect().height) + 32; notify('ui/notifications/size-changed', { height: h }); }
  function statusClass(s){
    s = String(s || '').toLowerCase();
    if (s.indexOf('ship') > -1 || s.indexOf('done') > -1 || s.indexOf('active') > -1) return 'ship';
    if (s.indexOf('slip') > -1 || s.indexOf('block') > -1 || s.indexOf('risk') > -1 || s.indexOf('behind') > -1) return 'slip';
    if (s.indexOf('silent') > -1 || s.indexOf('quiet') > -1 || s.indexOf('no ') > -1) return 'silent';
    return 'neutral';
  }
  function row(name, tag, detail, hint){
    return '<div class="row"><span class="dot2 ' + statusClass(hint || tag) + '"></span><div>'
      + '<div class="r-name">' + esc(name) + (tag ? '<span class="r-tag">' + esc(tag) + '</span>' : '') + '</div>'
      + (detail ? '<div class="r-detail">' + esc(detail) + '</div>' : '') + '</div></div>';
  }
  function renderList(d){
    var reports = d.reports || [];
    el('kicker').textContent = (d.count != null ? d.count : reports.length) + ' reports';
    if (!reports.length){ el('content').innerHTML = '<div class="empty">No reports yet.</div>'; return; }
    var h = '';
    for (var i = 0; i < reports.length; i++){
      var r = reports[i] || {};
      h += row(r.headline || ('Report ' + (r.scope || '')), when(r.generated_at), r.scope ? ('scope: ' + r.scope) : '', '');
    }
    el('content').innerHTML = h;
  }
  function renderReport(d){
    var body = d.report || d;
    el('kicker').textContent = when(d.generated_at);
    var h = '';
    var headline = body && (body.headline || body.title || body.summary);
    if (headline){ h += '<div class="headline">' + esc(headline) + '</div>'; }
    var rendered = false;
    if (body && typeof body === 'object'){
      for (var k in body){
        if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
        var v = body[k];
        if (Array.isArray(v) && v.length && typeof v[0] === 'object'){
          h += '<div class="sect">' + esc(k) + '</div>';
          for (var j = 0; j < v.length; j++){
            var it = v[j] || {};
            h += row(it.name || it.member || it.who || it.title || '-', it.status || it.state || '', it.detail || it.note || it.summary || '', it.status || it.state || k);
          }
          rendered = true;
        }
      }
    }
    if (!headline && !rendered){ h += '<pre>' + esc(JSON.stringify(body, null, 2)) + '</pre>'; }
    el('content').innerHTML = h || '<div class="empty">Empty report.</div>';
  }
  function render(structured){
    try {
      if (!structured) return;
      if (structured.reports) renderList(structured); else renderReport(structured);
    } catch(e){ el('content').innerHTML = '<div class="empty">Could not render this report.</div>'; }
    setTimeout(reportHeight, 0);
  }
  window.addEventListener('message', function(ev){
    var m = ev.data; if (!m || typeof m !== 'object') return;
    if (m.method === 'ui/notifications/tool-result'){ var p = m.params || {}; render(p.structuredContent || null); }
    else if (m.method === 'ui/notifications/host-context-changed'){ if (m.params && m.params.theme) setTheme(m.params.theme); }
    else if (m.id && m.result){ var hc = m.result.hostContext || {}; if (hc.theme) setTheme(hc.theme); }
  });
  post({ id: reqId++, method: 'ui/initialize', params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: 'eodly-report-view', version: '1.0.0' } } });
  notify('ui/notifications/initialized', {});
  setTimeout(reportHeight, 30);
})();
</script>
</body>
</html>`
