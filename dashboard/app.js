// creatingfire.org — Orchestration Dashboard

const BASE_URL = window.location.origin; // same-origin Worker

const App = (() => {
  function getKey() {
    return localStorage.getItem('cf_api_key') ?? '';
  }

  function saveKey() {
    const key = document.getElementById('api-key').value.trim();
    localStorage.setItem('cf_api_key', key);
    showResult('submit-result', { saved: true });
  }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getKey(),
    };
  }

  function showResult(elId, data) {
    const el = document.getElementById(elId);
    el.style.display = 'block';
    el.textContent = JSON.stringify(data, null, 2);
  }

  function badge(status) {
    return `<span class="badge ${status}">${status}</span>`;
  }

  // ── Health check ────────────────────────────────────────────────────────────
  async function checkHealth() {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-label');
    try {
      const r = await fetch(`${BASE_URL}/health`);
      const d = await r.json();
      dot.className = 'ok';
      label.textContent = `Operational — ${d.timestamp}`;
    } catch {
      dot.className = 'err';
      label.textContent = 'Unreachable';
    }
  }

  // ── Submit Workflow ─────────────────────────────────────────────────────────
  async function submitWorkflow() {
    const domain = document.getElementById('w-domain').value;
    const action = document.getElementById('w-action').value.trim();
    let payload = {};
    try {
      payload = JSON.parse(document.getElementById('w-payload').value);
    } catch {
      showResult('submit-result', { error: 'Invalid JSON payload' });
      return;
    }
    try {
      const r = await fetch(`${BASE_URL}/workflow`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ domain, action, payload }),
      });
      const d = await r.json();
      showResult('submit-result', d);
    } catch (e) {
      showResult('submit-result', { error: String(e) });
    }
  }

  // ── Check Status ────────────────────────────────────────────────────────────
  async function checkStatus() {
    const jobId = document.getElementById('s-jobid').value.trim();
    if (!jobId) { showResult('status-result', { error: 'Enter a job ID' }); return; }
    try {
      const r = await fetch(`${BASE_URL}/workflow/${jobId}`, {
        headers: authHeaders(),
      });
      const d = await r.json();
      showResult('status-result', d);
    } catch (e) {
      showResult('status-result', { error: String(e) });
    }
  }

  // ── Load Workflow Keys ──────────────────────────────────────────────────────
  async function loadWorkflows() {
    const prefix = document.getElementById('kv-prefix').value.trim() || 'workflow:';
    const list = document.getElementById('jobs-list');
    list.innerHTML = '<li><span style="color:var(--muted)">Loading…</span></li>';
    try {
      const r = await fetch(`${BASE_URL}/workflows?prefix=${encodeURIComponent(prefix)}`, {
        headers: authHeaders(),
      });
      const d = await r.json();
      const keys = d.workflows ?? [];
      if (keys.length === 0) {
        list.innerHTML = '<li><span id="empty-msg">No workflows found for this prefix</span></li>';
        return;
      }
      list.innerHTML = keys.map((k) => `
        <li>
          <span class="job-id">${k}</span>
          <button class="secondary" style="font-size:11px;padding:4px 10px"
            onclick="App.inspectKey('${k}')">Inspect</button>
        </li>`).join('');
    } catch (e) {
      list.innerHTML = `<li><span style="color:var(--red)">${e}</span></li>`;
    }
  }

  async function inspectKey(key) {
    const r = await fetch(`${BASE_URL}/config/${key}`, { headers: authHeaders() });
    const d = await r.json();
    showResult('status-result', d);
    document.getElementById('s-jobid').value = key;
  }

  // ── Config ──────────────────────────────────────────────────────────────────
  async function getConfig() {
    const key = document.getElementById('cfg-key').value.trim();
    if (!key) return;
    try {
      const r = await fetch(`${BASE_URL}/config/${key}`, { headers: authHeaders() });
      const d = await r.json();
      const el = document.getElementById('cfg-result');
      el.style.display = 'block';
      el.textContent = JSON.stringify(d, null, 2);
    } catch (e) {
      console.error(e);
    }
  }

  async function setConfig() {
    const key = document.getElementById('cfg-key').value.trim();
    let val;
    try { val = JSON.parse(document.getElementById('cfg-val').value); } catch {
      val = document.getElementById('cfg-val').value;
    }
    if (!key) return;
    try {
      const r = await fetch(`${BASE_URL}/config/${key}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(val),
      });
      const d = await r.json();
      const el = document.getElementById('cfg-result');
      el.style.display = 'block';
      el.textContent = JSON.stringify(d, null, 2);
    } catch (e) {
      console.error(e);
    }
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const stored = localStorage.getItem('cf_api_key');
    if (stored) document.getElementById('api-key').value = stored;
    checkHealth();
    setInterval(checkHealth, 30000);
  });

  return { saveKey, submitWorkflow, checkStatus, loadWorkflows, inspectKey, getConfig, setConfig };
})();
