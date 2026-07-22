// creatingfire.org — Dashboard + Landing Page

const BASE_URL = window.location.origin; // same-origin Worker

const App = (() => {
  let _signupPlan = 'starter';
  // API key held in memory only — never written to storage to protect the credential
  let _apiKey = '';

  function getKey() {
    return _apiKey;
  }

  function saveKey() {
    _apiKey = document.getElementById('api-key').value.trim();
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

  // ── Sign-up flow ────────────────────────────────────────────────────────────
  function openSignup(plan) {
    _signupPlan = plan || 'starter';
    const form = document.getElementById('signup-form');
    const label = document.getElementById('signup-plan-label');
    const result = document.getElementById('signup-result');
    form.style.display = 'block';
    label.textContent = `Plan: ${_signupPlan}`;
    result.style.display = 'none';
    result.className = '';
    document.getElementById('signup-email').focus();
    document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
  }

  function closeSignup() {
    document.getElementById('signup-form').style.display = 'none';
  }

  async function submitSignup() {
    const email = document.getElementById('signup-email').value.trim();
    const result = document.getElementById('signup-result');
    const btn = document.getElementById('signup-btn');
    if (!email || !email.includes('@')) {
      result.className = 'error';
      result.style.display = 'block';
      result.textContent = 'Please enter a valid email address.';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Redirecting…';
    result.style.display = 'none';
    try {
      const r = await fetch(`${BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: _signupPlan }),
      });
      const d = await r.json();
      if (d.url) {
        window.location.href = d.url; // redirect to Stripe Checkout
      } else {
        throw new Error(d.error || 'Unknown error');
      }
    } catch (e) {
      result.className = 'error';
      result.style.display = 'block';
      result.textContent = 'Error: ' + String(e);
      btn.disabled = false;
      btn.textContent = 'Continue to payment →';
    }
  }

  // ── Retrieve key after successful Stripe Checkout ───────────────────────────
  async function retrieveKeyFromSession() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;
    try {
      const r = await fetch(`${BASE_URL}/signup/success?session_id=${encodeURIComponent(sessionId)}`);
      const d = await r.json();
      if (d.apiKey) {
        _apiKey = d.apiKey;
        document.getElementById('api-key').value = d.apiKey;
        const meSection = document.getElementById('me-section');
        meSection.innerHTML = `
          <p style="color:var(--green);font-weight:600;margin-bottom:12px">✓ Payment successful! Your API key is ready.</p>
          <label>Your API Key (copy and save somewhere safe — it will not be shown again)</label>
          <input type="text" value="${d.apiKey}" readonly onclick="this.select()"
            style="font-family:monospace;font-size:12px;letter-spacing:0.5px" />
          <p style="color:var(--muted);font-size:12px;margin-top:4px">
            Use this as your <code>Authorization: ******;key&gt;</code> header.
          </p>`;
        document.getElementById('dashboard-section').scrollIntoView({ behavior: 'smooth' });
        // Clean the URL
        history.replaceState(null, '', '/');
      }
    } catch (e) {
      console.error('Failed to retrieve session key', e);
    }
  }

  // ── My Usage ────────────────────────────────────────────────────────────────
  async function loadMe() {
    const key = getKey();
    if (!key) {
      document.getElementById('me-section').innerHTML =
        '<p style="color:var(--red)">Save your API key first.</p>';
      return;
    }
    try {
      const r = await fetch(`${BASE_URL}/me`, { headers: authHeaders() });
      const d = await r.json();
      if (!r.ok) {
        document.getElementById('me-section').innerHTML =
          `<p style="color:var(--red)">${d.error || 'Unauthorized'}</p>`;
        return;
      }
      if (d.role === 'admin') {
        document.getElementById('me-section').innerHTML =
          '<p style="color:var(--accent)">Signed in as admin — no quota limits.</p>';
        return;
      }
      const pct = Math.min(100, Math.round((d.usedThisMonth ?? 0) / d.quotaPerMonth * 100)) || 0;
      document.getElementById('me-section').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">EMAIL</div><div>${d.email}</div></div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">PLAN</div><div style="text-transform:capitalize;color:var(--accent);font-weight:600">${d.plan}</div></div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">STATUS</div><div>${d.status}</div></div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">MEMBER SINCE</div><div>${new Date(d.createdAt).toLocaleDateString()}</div></div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">MONTHLY USAGE</div>
        <div class="usage-bar-bg"><div class="usage-bar-fill" style="width:${pct}%"></div></div>
        <div class="usage-label">${d.usedThisMonth ?? 0} / ${d.quotaPerMonth} jobs used this month</div>`;
    } catch (e) {
      document.getElementById('me-section').innerHTML =
        `<p style="color:var(--red)">${e}</p>`;
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
    checkHealth();
    setInterval(checkHealth, 30000);
    retrieveKeyFromSession();
  });

  return {
    saveKey, loadMe,
    openSignup, closeSignup, submitSignup,
    submitWorkflow, checkStatus, loadWorkflows, inspectKey,
    getConfig, setConfig,
  };
})();
