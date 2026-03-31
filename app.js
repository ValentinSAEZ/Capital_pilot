import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://rsvjdpuhrkczzgibdsff.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzdmpkcHVocmtjenpnaWJkc2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDgzOTEsImV4cCI6MjA5MDUyNDM5MX0.v-bMdJy3Kp2dtcGJ0-V5p-2ONQBaZiuVnnzXwrDTP4U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── FORMATTERS ────────────────────────────────
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const pct = (n) => `${(+n || 0).toFixed(1)} %`;

const bucketLabels = { cash: 'Cash', savings: 'Épargne', equities: 'Actions / ETF', bonds: 'Obligations', real_assets: 'Immobilier', debt: 'Crédit' };
const priorityLabels = { critical: 'Urgent', high: 'Haute', medium: 'Normale', low: 'Basse' };
const comfortLabels = { safe: 'Prudent', balanced: 'Équilibré', dynamic: 'Dynamique' };

// ── STATE ─────────────────────────────────────
let state = { user: null, profile: {}, accounts: [], goals: [], family: null, familyMembers: [] };
let marketTimer = null;

// ── INIT ──────────────────────────────────────
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    state.user = session.user;
    try { await loadAll(); } catch (e) { console.warn('loadAll:', e); }
    showApp();
  } else {
    showAuth();
  }
})();

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') { state.user = null; showAuth(); }
});

// ── AUTH ──────────────────────────────────────
function showAuth() {
  document.getElementById('auth-screen').classList.remove('is-hidden');
  document.getElementById('app').classList.add('is-hidden');
  document.body.classList.add('auth-active');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('is-hidden');
  document.getElementById('app').classList.remove('is-hidden');
  document.body.classList.remove('auth-active');
  document.getElementById('user-name').textContent =
    state.profile.display_name || state.user?.user_metadata?.display_name || state.user?.email?.split('@')[0] || 'Vous';
  renderAll();
  if (marketTimer) clearInterval(marketTimer);
  fetchMarketData();
  marketTimer = setInterval(fetchMarketData, 5 * 60 * 1000);
}

document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.target;
    document.getElementById('login-form').classList.toggle('auth-form--hidden', t !== 'login-form');
    document.getElementById('signup-form').classList.toggle('auth-form--hidden', t !== 'signup-form');
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.target === t));
    document.getElementById('auth-error').classList.add('is-hidden');
  });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    const fd = new FormData(e.target);
    const { data, error } = await supabase.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
    if (error) { showAuthError(error.message.includes('Invalid') ? 'Email ou mot de passe incorrect.' : error.message); return; }
    state.user = data.user;
    try { await loadAll(); } catch {}
    showApp();
  } catch { showAuthError('Erreur réseau. Vérifiez votre connexion.'); }
  finally { btn.disabled = false; btn.textContent = 'Se connecter'; }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Création…';
  const fd = new FormData(e.target);
  const email = fd.get('email'), password = fd.get('password');
  try {
    const { error: upErr } = await supabase.auth.signUp({ email, password, options: { data: { display_name: fd.get('display_name') } } });
    if (upErr) { showAuthError(upErr.message.includes('already') ? 'Cet email est déjà utilisé.' : upErr.message); return; }
    const { data, error: inErr } = await supabase.auth.signInWithPassword({ email, password });
    if (inErr) { showAuthError('Compte créé ! Connectez-vous maintenant.'); return; }
    state.user = data.user;
    const code = fd.get('invite_code').trim().toUpperCase();
    if (code) try { await joinFamilyByCode(code); } catch {}
    try { await loadAll(); } catch {}
    showApp();
  } catch { showAuthError('Erreur réseau. Vérifiez votre connexion.'); }
  finally { btn.disabled = false; btn.textContent = 'Créer mon compte'; }
});

document.getElementById('logout-btn').addEventListener('click', () => supabase.auth.signOut());

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('is-hidden');
}

// ── DATA ──────────────────────────────────────
async function loadAll() {
  const uid = state.user.id;
  const [pR, aR, gR] = await Promise.all([
    supabase.from('fp_profiles').select('*').eq('id', uid).single(),
    supabase.from('fp_accounts').select('*').eq('user_id', uid).order('created_at'),
    supabase.from('fp_goals').select('*').eq('user_id', uid).order('created_at'),
  ]);
  state.profile = pR.data || {};
  state.accounts = aR.data || [];
  state.goals = gR.data || [];

  if (state.profile.family_id) {
    const [fR, mR] = await Promise.all([
      supabase.from('fp_families').select('*').eq('id', state.profile.family_id).single(),
      supabase.from('fp_profiles').select('id, display_name').eq('family_id', state.profile.family_id),
    ]);
    state.family = fR.data;
    state.familyMembers = mR.data || [];
  }
}

function renderAll() {
  renderKPIs();
  renderProfileForm();
  renderAccounts();
  renderGoals();
  renderSidebar();
}

// ── KPIs ──────────────────────────────────────
function renderKPIs() {
  const { accounts, profile } = state;
  const assets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const debts = accounts.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
  const net = assets - debts;
  const income = profile.monthly_income || 0;
  const expenses = profile.monthly_expenses || 0;
  const surplus = income - expenses;
  const rate = income > 0 ? surplus / income * 100 : 0;
  const nextGoal = state.goals.filter(g => g.current < g.target).sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] - { critical: 0, high: 1, medium: 2, low: 3 }[b.priority]))[0];

  document.getElementById('kpi-networth').querySelector('.kpi-value').textContent = eur(net);
  const surplusEl = document.getElementById('kpi-surplus').querySelector('.kpi-value');
  surplusEl.textContent = eur(surplus);
  surplusEl.style.color = surplus >= 0 ? 'var(--ok)' : 'var(--danger)';
  const rateEl = document.getElementById('kpi-rate').querySelector('.kpi-value');
  rateEl.textContent = pct(rate);
  rateEl.style.color = rate >= 20 ? 'var(--ok)' : rate >= 10 ? 'var(--warn)' : 'var(--danger)';
  if (nextGoal) {
    document.getElementById('kpi-goal').querySelector('.kpi-value').textContent = `${Math.round(nextGoal.current / nextGoal.target * 100)} %`;
    document.getElementById('kpi-goal-label').textContent = nextGoal.label;
  } else {
    document.getElementById('kpi-goal').querySelector('.kpi-value').textContent = '—';
    document.getElementById('kpi-goal-label').textContent = 'Aucun objectif';
  }
  document.getElementById('sidebar-net-worth').textContent = eur(net);
  document.getElementById('sidebar-savings-rate').textContent = income > 0 ? `Épargne : ${pct(rate)}` : 'Renseignez vos revenus';
}

// ── PROFILE ───────────────────────────────────
function renderProfileForm() {
  const form = document.getElementById('profile-form');
  const p = state.profile;
  ['monthly_income','monthly_expenses','comfort','investment_horizon_years','emergency_months',
   'target_savings_rate','project_label','project_type','project_target','project_years'].forEach(f => {
    const el = form.elements[f];
    if (el && p[f] != null) el.value = p[f];
  });
}

document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const btn = document.getElementById('save-profile-btn');
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  const form = document.getElementById('profile-form');
  const fd = new FormData(form);
  const patch = {
    monthly_income: +fd.get('monthly_income') || 0,
    monthly_expenses: +fd.get('monthly_expenses') || 0,
    comfort: fd.get('comfort') || 'balanced',
    investment_horizon_years: +fd.get('investment_horizon_years') || 0,
    emergency_months: +fd.get('emergency_months') || 6,
    target_savings_rate: +fd.get('target_savings_rate') || 0,
    project_label: fd.get('project_label') || '',
    project_type: fd.get('project_type') || 'capitalisation',
    project_target: +fd.get('project_target') || 0,
    project_years: +fd.get('project_years') || 0,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('fp_profiles').update(patch).eq('id', state.user.id);
  if (error) {
    alert('Impossible d\'enregistrer : ' + error.message);
    btn.disabled = false; btn.textContent = orig;
    return;
  }
  Object.assign(state.profile, patch);
  renderAll();
  btn.textContent = '✓ Enregistré';
  setTimeout(() => { btn.disabled = false; btn.textContent = orig; }, 2000);
});

// ── ACCOUNTS ──────────────────────────────────
function renderAccounts() {
  const grid = document.getElementById('accounts-grid');
  const positive = state.accounts.filter(a => a.bucket !== 'debt' && a.balance > 0);
  const total = positive.reduce((s, a) => s + a.balance, 0);
  const bucketTotals = {};
  positive.forEach(a => { bucketTotals[a.bucket] = (bucketTotals[a.bucket] || 0) + a.balance; });
  document.getElementById('allocation-bar').innerHTML = Object.entries(bucketTotals).map(([b, v]) =>
    `<div class="alloc-segment ${b}" style="width:${total > 0 ? (v/total*100).toFixed(1) : 0}%"></div>`).join('');
  document.getElementById('allocation-legend').innerHTML = Object.entries(bucketTotals).map(([b, v]) =>
    `<span class="legend-item"><span class="legend-dot" style="background:var(--${b === 'savings' ? 'cash' : b})"></span>${bucketLabels[b] || b} ${pct(total > 0 ? v/total*100 : 0)}</span>`).join('');

  if (!state.accounts.length) {
    grid.innerHTML = `<div class="empty-state">Pas encore de compte renseigné.<br>Cliquez sur <strong>+ Ajouter</strong> pour commencer.</div>`;
    return;
  }
  grid.innerHTML = state.accounts.map(a => `
    <div class="account-card bucket-${a.bucket}" data-id="${a.id}">
      <div class="account-head">
        <span class="account-label">${a.label}</span>
        ${a.wrapper ? `<span class="account-wrapper">${a.wrapper}</span>` : ''}
      </div>
      <div class="account-balance ${a.balance < 0 ? 'negative' : ''}">${eur(a.balance)}</div>
      <div class="account-meta">
        <span class="account-type-badge">${bucketLabels[a.bucket] || a.bucket}</span>
        ${a.rate ? `<span class="account-rate">${a.rate} %/an</span>` : ''}
      </div>
    </div>`).join('');
  grid.querySelectorAll('.account-card').forEach(c => c.addEventListener('click', () => openAccountDialog(c.dataset.id)));
}

document.getElementById('add-account-btn').addEventListener('click', () => openAccountDialog(null));

function openAccountDialog(id) {
  const dialog = document.getElementById('account-dialog');
  const form = document.getElementById('account-form');
  const delBtn = document.getElementById('delete-account-btn');
  form.reset(); form.elements.id.value = '';
  document.getElementById('account-dialog-title').textContent = id ? 'Modifier' : 'Nouveau compte';
  delBtn.classList.toggle('is-hidden', !id);
  if (id) {
    const a = state.accounts.find(a => a.id === id);
    if (a) { form.elements.id.value = a.id; form.elements.label.value = a.label; form.elements.bucket.value = a.bucket; form.elements.balance.value = a.balance; form.elements.rate.value = a.rate || ''; form.elements.wrapper.value = a.wrapper || ''; }
  }
  dialog.showModal();
}

document.getElementById('account-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id');
  const row = { user_id: state.user.id, label: fd.get('label'), bucket: fd.get('bucket'), balance: +fd.get('balance'), rate: +fd.get('rate') || 0, wrapper: fd.get('wrapper'), updated_at: new Date().toISOString() };
  if (id) {
    await supabase.from('fp_accounts').update(row).eq('id', id).eq('user_id', state.user.id);
    state.accounts = state.accounts.map(a => a.id === id ? { ...a, ...row, id } : a);
  } else {
    const { data } = await supabase.from('fp_accounts').insert(row).select().single();
    if (data) state.accounts.push(data);
  }
  document.getElementById('account-dialog').close();
  renderAccounts(); renderKPIs();
});

document.getElementById('delete-account-btn').addEventListener('click', async () => {
  const id = document.getElementById('account-form').elements.id.value;
  if (!id || !confirm('Supprimer ce compte ?')) return;
  await supabase.from('fp_accounts').delete().eq('id', id).eq('user_id', state.user.id);
  state.accounts = state.accounts.filter(a => a.id !== id);
  document.getElementById('account-dialog').close();
  renderAccounts(); renderKPIs();
});

// ── GOALS ─────────────────────────────────────
function renderGoals() {
  const grid = document.getElementById('goals-grid');
  if (!state.goals.length) {
    grid.innerHTML = `<div class="empty-state">Pas encore d'objectif.<br>Cliquez sur <strong>+ Ajouter</strong> pour définir un projet.</div>`;
    return;
  }
  grid.innerHTML = state.goals.map(g => {
    const p = g.target > 0 ? Math.min(100, g.current / g.target * 100) : 0;
    const rem = g.target - g.current;
    const months = g.monthly_contribution > 0 ? Math.ceil(rem / g.monthly_contribution) : null;
    return `<div class="goal-card" data-id="${g.id}">
      <div class="goal-head"><span class="goal-label">${g.label}</span><span class="priority-badge priority-${g.priority}">${priorityLabels[g.priority]}</span></div>
      <div class="goal-amounts"><span class="goal-current">${eur(g.current)}</span><span class="goal-target">/ ${eur(g.target)}</span></div>
      <div class="goal-track"><div class="goal-fill" style="width:${p.toFixed(1)}%"></div></div>
      <div class="goal-footer"><span>${p.toFixed(0)} % atteint</span><span>${months ? `encore ${months} mois` : `horizon ${g.horizon_months} mois`}</span></div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.goal-card').forEach(c => c.addEventListener('click', () => openGoalDialog(c.dataset.id)));
}

document.getElementById('add-goal-btn').addEventListener('click', () => openGoalDialog(null));

function openGoalDialog(id) {
  const dialog = document.getElementById('goal-dialog');
  const form = document.getElementById('goal-form');
  const delBtn = document.getElementById('delete-goal-btn');
  form.reset(); form.elements.id.value = '';
  document.getElementById('goal-dialog-title').textContent = id ? 'Modifier l\'objectif' : 'Nouvel objectif';
  delBtn.classList.toggle('is-hidden', !id);
  if (id) {
    const g = state.goals.find(g => g.id === id);
    if (g) { form.elements.id.value = g.id; form.elements.label.value = g.label; form.elements.target.value = g.target; form.elements.current.value = g.current; form.elements.monthly_contribution.value = g.monthly_contribution; form.elements.horizon_months.value = g.horizon_months; form.elements.priority.value = g.priority; }
  }
  dialog.showModal();
}

document.getElementById('goal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id');
  const row = { user_id: state.user.id, label: fd.get('label'), target: +fd.get('target'), current: +fd.get('current'), monthly_contribution: +fd.get('monthly_contribution'), horizon_months: +fd.get('horizon_months'), priority: fd.get('priority') };
  if (id) {
    await supabase.from('fp_goals').update(row).eq('id', id).eq('user_id', state.user.id);
    state.goals = state.goals.map(g => g.id === id ? { ...g, ...row, id } : g);
  } else {
    const { data } = await supabase.from('fp_goals').insert(row).select().single();
    if (data) state.goals.push(data);
  }
  document.getElementById('goal-dialog').close();
  renderGoals(); renderKPIs();
});

document.getElementById('delete-goal-btn').addEventListener('click', async () => {
  const id = document.getElementById('goal-form').elements.id.value;
  if (!id || !confirm('Supprimer cet objectif ?')) return;
  await supabase.from('fp_goals').delete().eq('id', id).eq('user_id', state.user.id);
  state.goals = state.goals.filter(g => g.id !== id);
  document.getElementById('goal-dialog').close();
  renderGoals(); renderKPIs();
});

// ── CLAUDE AI ADVICE ──────────────────────────
document.getElementById('get-advice-btn').addEventListener('click', async () => {
  const btn = document.getElementById('get-advice-btn');
  const content = document.getElementById('advice-content');
  const income = state.profile.monthly_income || 0;
  const expenses = state.profile.monthly_expenses || 0;

  if (!income && !expenses && !state.accounts.length) {
    content.innerHTML = `<div class="advice-placeholder"><p>👆 Renseignez d'abord vos revenus et dépenses dans <strong>Ma situation</strong>, puis revenez ici pour votre analyse.</p></div>`;
    return;
  }

  btn.disabled = true;
  content.innerHTML = `<div class="advice-loading"><div class="spinner"></div>Analyse de votre situation en cours…</div>`;

  try {
    // Forcer un refresh du token pour éviter les JWT expirés
    const { data: refreshData } = await supabase.auth.refreshSession();
    const session = refreshData?.session;
    if (!session?.access_token) throw new Error('Session expirée, reconnectez-vous.');

    const res = await fetch(`${SUPABASE_URL}/functions/v1/finance-advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({
        profile: state.profile,
        accounts: state.accounts,
        goals: state.goals,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 500 && errText.includes('OPENAI_API_KEY')) {
        throw new Error('La clé API OpenAI n\'est pas configurée dans Supabase.');
      }
      throw new Error(`Erreur ${res.status} : ${errText || 'indisponible'}`);
    }

    const data = await res.json();
    if (!data?.advice) throw new Error('Réponse vide du conseiller IA.');

    content.innerHTML = `<div class="advice-ai-content">${data.advice}</div>`;
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('advice-timestamp').textContent = `Analysé à ${now}`;
  } catch (err) {
    content.innerHTML = `<div class="advice-placeholder" style="color:var(--danger)">
      <p>⚠️ ${err.message}</p>
      <p style="margin-top:.5rem;color:var(--muted);font-size:.85rem">Si le problème persiste, contactez Valentin.</p>
    </div>`;
  } finally {
    btn.disabled = false;
  }
});

// ── MARKET DATA ───────────────────────────────
async function fetchMarketData() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/finance-market`, { headers: { apikey: SUPABASE_ANON } });
    const data = await res.json();
    if (!Array.isArray(data)) return;
    document.getElementById('market-ticker').innerHTML = data.filter(d => !d.error).map((d, i) => `
      ${i > 0 ? '<span class="ticker-sep">·</span>' : ''}
      <div class="ticker-item">
        <span class="ticker-label">${d.label}</span>
        <span class="ticker-price">${d.id === 'EURUSD' ? (+d.price).toFixed(4) : d.id === 'BTC' ? eur(d.price) : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(d.price)}</span>
        <span class="ticker-change ${d.change >= 0 ? 'up' : 'down'}">${d.change >= 0 ? '+' : ''}${(+d.change).toFixed(2)} %</span>
      </div>`).join('');
  } catch {
    document.getElementById('market-ticker').innerHTML = `<span class="ticker-loading">Marchés indisponibles</span>`;
  }
}

// ── SIDEBAR ───────────────────────────────────
function renderSidebar() {
  const fam = document.getElementById('sidebar-family');
  fam.classList.remove('is-hidden');
  const list = document.getElementById('family-members-list');
  if (state.familyMembers.length) {
    list.innerHTML = state.familyMembers.map(m =>
      `<div class="family-member-row"><span class="member-dot"></span>${m.display_name || 'Membre'}</div>`).join('');
  } else {
    list.innerHTML = `<p style="color:var(--muted);font-size:.82rem;margin:0 0 .6rem">Invitez votre famille avec un code.</p>`;
  }
  document.getElementById('family-switcher').classList.toggle('is-hidden', !state.family);
}

// ── FAMILY ────────────────────────────────────
document.getElementById('create-family-btn').addEventListener('click', async () => {
  const name = prompt('Nom de votre famille (ex : Famille Saez)');
  if (!name) return;
  const { data: fam, error } = await supabase.from('fp_families').insert({ name, created_by: state.user.id }).select().single();
  if (error || !fam) { alert('Erreur : ' + (error?.message || 'inconnu')); return; }
  await supabase.from('fp_profiles').update({ family_id: fam.id }).eq('id', state.user.id);
  state.family = fam;
  state.profile.family_id = fam.id;
  state.familyMembers = [{ id: state.user.id, display_name: state.profile.display_name }];
  renderSidebar();
  const dialog = document.getElementById('family-dialog');
  document.getElementById('family-dialog-title').textContent = 'Famille créée !';
  document.getElementById('family-dialog-content').innerHTML = `
    <p style="color:var(--text-soft);margin:0 0 1rem">Partagez ce code à votre famille :</p>
    <div class="family-code-display">
      <div class="family-code">${fam.invite_code}</div>
      <div class="family-code-hint">À saisir lors de la création de compte</div>
    </div>
    <div style="margin-top:1rem;display:flex;justify-content:flex-end">
      <button class="primary-button" onclick="document.getElementById('family-dialog').close()">Fermer</button>
    </div>`;
  dialog.showModal();
});

document.getElementById('join-family-btn').addEventListener('click', () => {
  const dialog = document.getElementById('family-dialog');
  document.getElementById('family-dialog-title').textContent = 'Rejoindre une famille';
  document.getElementById('family-dialog-content').innerHTML = `
    <div class="join-form">
      <p style="color:var(--text-soft);margin:0 0 .8rem">Entrez le code reçu d'un membre de la famille :</p>
      <input id="join-code-input" type="text" maxlength="8" placeholder="XXXXXXXX">
      <div style="display:flex;justify-content:flex-end;gap:.6rem;margin-top:.6rem">
        <button class="ghost-button" onclick="document.getElementById('family-dialog').close()">Annuler</button>
        <button class="primary-button" id="confirm-join-btn">Rejoindre</button>
      </div>
    </div>`;
  dialog.showModal();
  document.getElementById('confirm-join-btn').addEventListener('click', async () => {
    const code = document.getElementById('join-code-input').value.trim().toUpperCase();
    if (!code) return;
    await joinFamilyByCode(code);
    dialog.close();
  });
});

async function joinFamilyByCode(code) {
  const { data: fam, error } = await supabase.from('fp_families').select('id, name, invite_code').eq('invite_code', code).single();
  if (error || !fam) { alert('Code famille invalide ou introuvable.'); return; }
  await supabase.from('fp_profiles').update({ family_id: fam.id }).eq('id', state.user.id);
  state.family = fam;
  state.profile.family_id = fam.id;
  await loadAll();
  renderSidebar();
}

// ── DIALOG CLOSE ──────────────────────────────
document.querySelectorAll('[data-close]').forEach(btn =>
  btn.addEventListener('click', () => document.getElementById(btn.dataset.close).close()));
