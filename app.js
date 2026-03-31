import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://rsvjdpuhrkczzgibdsff.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzdmpkcHVocmtjenpnaWJkc2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDgzOTEsImV4cCI6MjA5MDUyNDM5MX0.v-bMdJy3Kp2dtcGJ0-V5p-2ONQBaZiuVnnzXwrDTP4U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── FORMATTERS ────────────────────────────────
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const pct = (n) => `${(+n).toFixed(1)} %`;
const roundTo50 = (n) => Math.max(0, Math.round((n || 0) / 50) * 50);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

// ── LABELS ────────────────────────────────────
const bucketLabels = {
  cash: 'Cash',
  savings: 'Épargne liquide',
  equities: 'Actions / ETF',
  bonds: 'Obligataire',
  real_assets: 'Immobilier',
  debt: 'Dette',
};

const priorityLabels = { critical: 'Critique', high: 'Haute', medium: 'Moyenne', low: 'Basse' };
const comfortLabels = { safe: 'Prudent', balanced: 'Équilibré', dynamic: 'Dynamique' };
const projectTypeLabels = {
  property: 'Achat immobilier',
  capitalisation: 'Capitalisation',
  retirement: 'Retraite',
  safety: 'Matelas de sécurité',
  income: 'Complément de revenus',
};

// ── STATE ─────────────────────────────────────
let state = { user: null, profile: {}, accounts: [], goals: [], family: null, familyMembers: [] };
let marketTimer = null;
let adviceRefreshTimer = null;
let adviceRequestVersion = 0;

// ── INIT : vérification session au chargement ──
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

// Déconnexion automatique si la session expire
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    state.user = null;
    showAuth();
  }
});

// ── AUTH UI ───────────────────────────────────
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
  refreshAdvice({ preferRemote: false }).catch(() => {});
}

// Tab switching in auth
document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    document.getElementById('login-form').classList.toggle('auth-form--hidden', target !== 'login-form');
    document.getElementById('signup-form').classList.toggle('auth-form--hidden', target !== 'signup-form');
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.target === target);
    });
    clearAuthError();
  });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Connexion…';
  try {
    const fd = new FormData(e.target);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fd.get('email'),
      password: fd.get('password'),
    });
    if (error) {
      const msg = (error.message.includes('Invalid login') || error.message.includes('invalid'))
        ? 'Email ou mot de passe incorrect.'
        : error.message.includes('confirmed')
        ? 'Compte non confirmé. Réessayez ou contactez l\'administrateur.'
        : error.message;
      showAuthError(msg);
      return;
    }
    // Succès : charger les données et afficher l'app directement
    state.user = data.user;
    try { await loadAll(); } catch (err) { console.warn('loadAll:', err); }
    showApp();
  } catch {
    showAuthError('Erreur réseau. Vérifiez votre connexion.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Création…';
  const fd = new FormData(e.target);
  const email = fd.get('email');
  const password = fd.get('password');
  try {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: fd.get('display_name') } },
    });
    if (signUpError) {
      const msg = (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered'))
        ? 'Cet email est déjà utilisé. Connectez-vous à la place.'
        : signUpError.message.includes('Password')
        ? 'Mot de passe trop court (8 caractères minimum).'
        : signUpError.message;
      showAuthError(msg);
      return;
    }
    // signUp ne retourne pas de session quand la confirmation email est active.
    // On enchaîne immédiatement un signIn pour obtenir une session valide.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      showAuthError('Compte créé mais connexion impossible : ' + signInError.message);
      return;
    }
    state.user = signInData.user;
    const code = fd.get('invite_code').trim().toUpperCase();
    if (code && state.user) {
      try { await joinFamilyByCode(code, state.user.id); } catch {}
    }
    try { await loadAll(); } catch (err) { console.warn('loadAll:', err); }
    showApp();
  } catch {
    showAuthError('Erreur réseau. Vérifiez votre connexion.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Créer mon compte';
  }
});

document.getElementById('logout-btn').addEventListener('click', () => supabase.auth.signOut());

function showAuthError(msg, type = 'error') {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.color = type === 'info' ? 'var(--ok)' : 'var(--danger)';
  el.style.background = type === 'info' ? 'rgba(127,197,154,0.1)' : 'rgba(241,138,124,0.1)';
  el.hidden = false;
}
function clearAuthError() { document.getElementById('auth-error').hidden = true; }

// ── DATA LOADING ──────────────────────────────
async function loadAll() {
  const uid = state.user.id;
  const [profileRes, accountsRes, goalsRes] = await Promise.all([
    supabase.from('fp_profiles').select('*').eq('id', uid).single(),
    supabase.from('fp_accounts').select('*').eq('user_id', uid).order('created_at'),
    supabase.from('fp_goals').select('*').eq('user_id', uid).order('created_at'),
  ]);

  state.profile = profileRes.data || {};
  state.accounts = accountsRes.data || [];
  state.goals = goalsRes.data || [];

  // Load family if any
  if (state.profile.family_id) {
    const [famRes, membersRes] = await Promise.all([
      supabase.from('fp_families').select('*').eq('id', state.profile.family_id).single(),
      supabase.from('fp_profiles').select('id, display_name').eq('family_id', state.profile.family_id),
    ]);
    state.family = famRes.data;
    state.familyMembers = membersRes.data || [];
  }
}

// ── RENDER ALL ────────────────────────────────
function renderAll() {
  renderKPIs();
  renderProfileForm();
  renderAccounts();
  renderGoals();
  renderSidebar();
  renderFamily();
  renderAdvicePlaceholder();
}

// ── EVENTS ────────────────────────────────────
document.getElementById('save-profile-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  const btn = e.target;
  const originalText = btn.textContent;
  btn.textContent = 'Enregistrement...';
  btn.disabled = true;

  const updates = getLiveProfileState();

  try {
    const { data, error } = await supabase.rpc('save_profile', {
      p_display_name: updates.display_name,
      p_monthly_income: updates.monthly_income,
      p_monthly_expenses: updates.monthly_expenses,
      p_comfort: updates.comfort,
      p_investment_horizon_years: updates.investment_horizon_years,
      p_emergency_months: updates.emergency_months,
      p_target_savings_rate: updates.target_savings_rate,
      p_project_label: updates.project_label,
      p_project_type: updates.project_type,
      p_project_target: updates.project_target,
      p_project_years: updates.project_years,
    });
    if (!error) {
      Object.assign(state.profile, data || updates);
      renderAll();
      await refreshAdvice({ preferRemote: false, loadingMessage: 'Analyse de votre plan en cours…' });
      btn.textContent = 'Enregistré !';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    } else {
      throw error;
    }
  } catch (err) {
    console.error('Erreur lors de la sauvegarde du profil:', err);
    btn.textContent = 'Erreur';
    alert(`Impossible d'enregistrer votre situation : ${err?.message || 'erreur inconnue'}`);
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  }
});

// ── KPIs ──────────────────────────────────────
function renderKPIs() {
  const { accounts, profile } = state;
  const assets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const debts = accounts.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
  const net = assets - debts;
  const income = profile.monthly_income || 0;
  const expenses = profile.monthly_expenses || 0;
  const surplus = income - expenses;
  const rate = income > 0 ? (surplus / income * 100) : 0;

  // Next goal
  const nextGoal = state.goals
    .filter(g => g.current < g.target)
    .sort((a, b) => { const pa = { critical: 0, high: 1, medium: 2, low: 3 }; return (pa[a.priority] ?? 2) - (pa[b.priority] ?? 2); })[0];

  const nextGoalPct = nextGoal ? Math.round(nextGoal.current / nextGoal.target * 100) : null;

  document.getElementById('kpi-networth').querySelector('.kpi-value').textContent = eur(net);
  document.getElementById('kpi-surplus').querySelector('.kpi-value').textContent = eur(surplus);
  document.getElementById('kpi-surplus').querySelector('.kpi-value').style.color = surplus >= 0 ? '' : 'var(--danger)';

  const rateEl = document.getElementById('kpi-rate').querySelector('.kpi-value');
  rateEl.textContent = pct(rate);
  rateEl.style.color = rate >= 20 ? 'var(--ok)' : rate >= 10 ? 'var(--warn)' : 'var(--danger)';

  if (nextGoal) {
    document.getElementById('kpi-goal').querySelector('.kpi-value').textContent = `${nextGoalPct} %`;
    document.getElementById('kpi-goal-label').textContent = nextGoal.label;
  }

  // Sidebar
  document.getElementById('sidebar-net-worth').textContent = eur(net);
  document.getElementById('sidebar-savings-rate').textContent = `Épargne : ${pct(rate)}`;
}

// ── PROFILE FORM ──────────────────────────────
function renderProfileForm() {
  const form = document.getElementById('profile-form');
  const p = state.profile;
  const fields = ['monthly_income','monthly_expenses','comfort','investment_horizon_years',
    'emergency_months','target_savings_rate','project_label','project_type','project_target','project_years'];
  fields.forEach(f => {
    const el = form.elements[f];
    if (el && p[f] != null) el.value = p[f];
  });
}

function getLiveProfileState() {
  const form = document.getElementById('profile-form');
  const fd = new FormData(form);
  return {
    id: state.user?.id,
    family_id: state.profile?.family_id ?? null,
    display_name: state.profile.display_name || state.user?.user_metadata?.display_name || state.user?.email?.split('@')[0],
    monthly_income: Number(fd.get('monthly_income')) || 0,
    monthly_expenses: Number(fd.get('monthly_expenses')) || 0,
    comfort: fd.get('comfort') || 'balanced',
    investment_horizon_years: Number(fd.get('investment_horizon_years')) || 0,
    emergency_months: Number(fd.get('emergency_months')) || 0,
    target_savings_rate: Number(fd.get('target_savings_rate')) || 0,
    project_label: fd.get('project_label')?.toString().trim() || '',
    project_type: fd.get('project_type') || 'capitalisation',
    project_target: Number(fd.get('project_target')) || 0,
    project_years: Number(fd.get('project_years')) || 0,
  };
}

function queueAdviceRefresh({ preferRemote = true, delay = 900 } = {}) {
  if (adviceRefreshTimer) clearTimeout(adviceRefreshTimer);
  adviceRefreshTimer = setTimeout(() => {
    refreshAdvice({ preferRemote, loadingMessage: 'Le compagnon financier réanalyse votre situation…' }).catch(() => {});
  }, delay);
}

document.getElementById('profile-form').addEventListener('input', (event) => {
  if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) return;
  queueAdviceRefresh({ preferRemote: true, delay: 1100 });
});

document.getElementById('profile-form').addEventListener('change', () => {
  queueAdviceRefresh({ preferRemote: true, delay: 400 });
});

// ── ACCOUNTS ──────────────────────────────────
function renderAccounts() {
  const grid = document.getElementById('accounts-grid');
  const nonDebt = state.accounts.filter(a => a.bucket !== 'debt' && a.balance > 0);
  const total = nonDebt.reduce((s, a) => s + a.balance, 0);

  // Allocation bar
  const bar = document.getElementById('allocation-bar');
  const legend = document.getElementById('allocation-legend');
  const bucketTotals = {};
  nonDebt.forEach(a => { bucketTotals[a.bucket] = (bucketTotals[a.bucket] || 0) + a.balance; });

  bar.innerHTML = Object.entries(bucketTotals).map(([b, v]) =>
    `<div class="alloc-segment ${b}" style="width:${total > 0 ? (v/total*100).toFixed(1) : 0}%"></div>`
  ).join('');

  legend.innerHTML = Object.entries(bucketTotals).map(([b, v]) =>
    `<span class="legend-item"><span class="legend-dot" style="background:var(--${b === 'savings' ? 'cash' : b})"></span>${bucketLabels[b] || b} ${pct(total > 0 ? v/total*100 : 0)}</span>`
  ).join('');

  if (!state.accounts.length) {
    grid.innerHTML = `<div class="empty-state">Aucun compte renseigné. Cliquez sur <strong>+ Ajouter</strong> pour commencer.</div>`;
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
        ${a.rate ? `<span class="account-rate">${a.rate} %</span>` : ''}
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.account-card').forEach(card => {
    card.addEventListener('click', () => openAccountDialog(card.dataset.id));
  });
}

// Account dialog
document.getElementById('add-account-btn').addEventListener('click', () => openAccountDialog(null));

function openAccountDialog(id) {
  const dialog = document.getElementById('account-dialog');
  const form = document.getElementById('account-form');
  const deleteBtn = document.getElementById('delete-account-btn');
  form.reset();
  form.elements.id.value = '';
  document.getElementById('account-dialog-title').textContent = id ? 'Modifier le compte' : 'Nouveau compte';
  deleteBtn.hidden = !id;
  if (id) {
    const acc = state.accounts.find(a => a.id === id);
    if (acc) {
      form.elements.id.value = acc.id;
      form.elements.label.value = acc.label;
      form.elements.bucket.value = acc.bucket;
      form.elements.balance.value = acc.balance;
      form.elements.rate.value = acc.rate || '';
      form.elements.wrapper.value = acc.wrapper || '';
    }
  }
  dialog.showModal();
}

document.getElementById('account-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id');
  const row = {
    user_id: state.user.id,
    label: fd.get('label'),
    bucket: fd.get('bucket'),
    balance: +fd.get('balance'),
    rate: +fd.get('rate') || 0,
    wrapper: fd.get('wrapper'),
    updated_at: new Date().toISOString(),
  };
  if (id) {
    await supabase.from('fp_accounts').update(row).eq('id', id).eq('user_id', state.user.id);
    state.accounts = state.accounts.map(a => a.id === id ? { ...a, ...row, id } : a);
  } else {
    const { data } = await supabase.from('fp_accounts').insert(row).select().single();
    if (data) state.accounts.push(data);
  }
  document.getElementById('account-dialog').close();
  renderAccounts();
  renderKPIs();
  await refreshAdvice({ preferRemote: false });
});

document.getElementById('delete-account-btn').addEventListener('click', async () => {
  const id = document.getElementById('account-form').elements.id.value;
  if (!id) return;
  await supabase.from('fp_accounts').delete().eq('id', id).eq('user_id', state.user.id);
  state.accounts = state.accounts.filter(a => a.id !== id);
  document.getElementById('account-dialog').close();
  renderAccounts();
  renderKPIs();
  await refreshAdvice({ preferRemote: false });
});

// ── GOALS ─────────────────────────────────────
function renderGoals() {
  const grid = document.getElementById('goals-grid');
  if (!state.goals.length) {
    grid.innerHTML = `<div class="empty-state">Aucun objectif défini. Cliquez sur <strong>+ Ajouter</strong> pour commencer.</div>`;
    return;
  }
  grid.innerHTML = state.goals.map(g => {
    const pctVal = g.target > 0 ? Math.min(100, g.current / g.target * 100) : 0;
    const remaining = g.target - g.current;
    const monthsLeft = g.monthly_contribution > 0 ? Math.ceil(remaining / g.monthly_contribution) : null;
    return `
      <div class="goal-card" data-id="${g.id}">
        <div class="goal-head">
          <span class="goal-label">${g.label}</span>
          <span class="priority-badge priority-${g.priority}">${priorityLabels[g.priority]}</span>
        </div>
        <div class="goal-amounts">
          <span class="goal-current">${eur(g.current)}</span>
          <span class="goal-target">/ ${eur(g.target)}</span>
        </div>
        <div class="goal-track"><div class="goal-fill" style="width:${pctVal.toFixed(1)}%"></div></div>
        <div class="goal-footer">
          <span>${pctVal.toFixed(0)} % atteint</span>
          <span>${monthsLeft ? `${monthsLeft} mois restants` : g.horizon_months + ' mois'}</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.goal-card').forEach(card => {
    card.addEventListener('click', () => openGoalDialog(card.dataset.id));
  });
}

document.getElementById('add-goal-btn').addEventListener('click', () => openGoalDialog(null));

function openGoalDialog(id) {
  const dialog = document.getElementById('goal-dialog');
  const form = document.getElementById('goal-form');
  const deleteBtn = document.getElementById('delete-goal-btn');
  form.reset();
  form.elements.id.value = '';
  document.getElementById('goal-dialog-title').textContent = id ? 'Modifier l\'objectif' : 'Nouvel objectif';
  deleteBtn.hidden = !id;
  if (id) {
    const g = state.goals.find(g => g.id === id);
    if (g) {
      form.elements.id.value = g.id;
      form.elements.label.value = g.label;
      form.elements.target.value = g.target;
      form.elements.current.value = g.current;
      form.elements.monthly_contribution.value = g.monthly_contribution;
      form.elements.horizon_months.value = g.horizon_months;
      form.elements.priority.value = g.priority;
    }
  }
  dialog.showModal();
}

document.getElementById('goal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('id');
  const row = {
    user_id: state.user.id,
    label: fd.get('label'),
    target: +fd.get('target'),
    current: +fd.get('current'),
    monthly_contribution: +fd.get('monthly_contribution'),
    horizon_months: +fd.get('horizon_months'),
    priority: fd.get('priority'),
  };
  if (id) {
    await supabase.from('fp_goals').update(row).eq('id', id).eq('user_id', state.user.id);
    state.goals = state.goals.map(g => g.id === id ? { ...g, ...row, id } : g);
  } else {
    const { data } = await supabase.from('fp_goals').insert(row).select().single();
    if (data) state.goals.push(data);
  }
  document.getElementById('goal-dialog').close();
  renderGoals();
  renderKPIs();
  await refreshAdvice({ preferRemote: false });
});

document.getElementById('delete-goal-btn').addEventListener('click', async () => {
  const id = document.getElementById('goal-form').elements.id.value;
  if (!id) return;
  await supabase.from('fp_goals').delete().eq('id', id).eq('user_id', state.user.id);
  state.goals = state.goals.filter(g => g.id !== id);
  document.getElementById('goal-dialog').close();
  renderGoals();
  renderKPIs();
  await refreshAdvice({ preferRemote: false });
});

// ── AI ADVICE ─────────────────────────────────
document.getElementById('get-advice-btn').addEventListener('click', async () => {
  await refreshAdvice({ preferRemote: true, loadingMessage: 'Le compagnon financier prépare votre plan…' });
});

function renderAdvicePlaceholder() {
  const content = document.getElementById('advice-content');
  const p = state.profile || {};
  const hasProfileData = p.monthly_income || p.monthly_expenses || p.project_label || p.project_target;
  if (hasProfileData) return;
  content.innerHTML = `
    <div class="advice-placeholder">
      <p>Indiquez votre revenu, vos dépenses et votre projet principal, puis cliquez sur <strong>Enregistrer</strong>. Le plan d'action se mettra à jour automatiquement.</p>
    </div>
  `;
}

async function refreshAdvice({ preferRemote = false, loadingMessage = 'Analyse en cours…' } = {}) {
  const btn = document.getElementById('get-advice-btn');
  const content = document.getElementById('advice-content');
  const snapshot = buildAdviceSnapshot();
  const requestVersion = ++adviceRequestVersion;

  if (!snapshot.isReady) {
    renderAdvicePlaceholder();
    document.getElementById('advice-timestamp').textContent = '';
    return;
  }

  btn.disabled = true;
  content.innerHTML = `<div class="advice-loading"><div class="spinner"></div>${loadingMessage}</div>`;

  const localPlan = buildLocalAdvice(snapshot);
  content.innerHTML = buildAdviceHtml(snapshot, localPlan, null, preferRemote ? 'Analyse IA en cours…' : '');

  const remoteResult = preferRemote ? await getRemoteAdvice(snapshot, localPlan, requestVersion) : { advice: null, error: '' };
  if (requestVersion !== adviceRequestVersion) return;

  content.innerHTML = buildAdviceHtml(snapshot, localPlan, remoteResult.advice, remoteResult.error);
  document.getElementById('advice-timestamp').textContent =
    `Mis à jour à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  btn.disabled = false;
}

function buildAdviceSnapshot() {
  const profile = getLiveProfileState();
  const income = Number(profile.monthly_income) || 0;
  const expenses = Number(profile.monthly_expenses) || 0;
  const surplus = income - expenses;
  const savingsRate = income > 0 ? (surplus / income) * 100 : 0;
  const positiveAccounts = state.accounts.filter((account) => account.balance > 0);
  const debts = state.accounts.filter((account) => account.balance < 0 || account.bucket === 'debt');
  const assets = positiveAccounts.reduce((sum, account) => sum + account.balance, 0);
  const debtBalance = debts.reduce((sum, account) => sum + Math.abs(account.balance), 0);
  const liquidAssets = positiveAccounts
    .filter((account) => ['cash', 'savings'].includes(account.bucket))
    .reduce((sum, account) => sum + account.balance, 0);
  const emergencyTarget = (Number(profile.emergency_months) || 0) * expenses;
  const emergencyGap = Math.max(0, emergencyTarget - liquidAssets);
  const bucketTotals = positiveAccounts.reduce((acc, account) => {
    acc[account.bucket] = (acc[account.bucket] || 0) + account.balance;
    return acc;
  }, {});
  const goals = buildAnalyzableGoals(profile);
  const targetMix = getTargetMix(profile.comfort, Number(profile.investment_horizon_years) || 0);
  const totalForMix = positiveAccounts
    .filter((account) => ['cash', 'savings', 'equities', 'bonds', 'real_assets'].includes(account.bucket))
    .reduce((sum, account) => sum + account.balance, 0);
  const currentMix = Object.fromEntries(
    Object.keys(targetMix).map((bucket) => [bucket, totalForMix > 0 ? ((bucketTotals[bucket] || 0) / totalForMix) * 100 : 0]),
  );

  return {
    profile,
    income,
    expenses,
    surplus,
    savingsRate,
    assets,
    debtBalance,
    netWorth: assets - debtBalance,
    liquidAssets,
    emergencyTarget,
    emergencyGap,
    totalForMix,
    bucketTotals,
    currentMix,
    targetMix,
    averageDebtRate: debts.length ? debts.reduce((sum, account) => sum + (Number(account.rate) || 0), 0) / debts.length : 0,
    goals,
    isReady: income > 0 || expenses > 0 || goals.length > 0,
  };
}

function buildAnalyzableGoals(profile) {
  if (state.goals.length) {
    return [...state.goals]
      .map((goal) => ({
        ...goal,
        target: Number(goal.target) || 0,
        current: Number(goal.current) || 0,
        monthly_contribution: Number(goal.monthly_contribution) || 0,
        horizon_months: Number(goal.horizon_months) || 0,
      }))
      .filter((goal) => goal.target > 0);
  }

  if ((Number(profile.project_target) || 0) > 0 || profile.project_label) {
    return [{
      id: 'profile-project',
      label: profile.project_label || projectTypeLabels[profile.project_type] || 'Projet principal',
      target: Number(profile.project_target) || 0,
      current: 0,
      monthly_contribution: 0,
      horizon_months: (Number(profile.project_years) || 0) * 12,
      priority: 'high',
      fromProfile: true,
    }].filter((goal) => goal.target > 0);
  }

  return [];
}

function getTargetMix(comfort = 'balanced', horizonYears = 0) {
  const baseMix = {
    safe: { cash: 15, savings: 30, equities: 20, bonds: 30, real_assets: 5 },
    balanced: { cash: 10, savings: 20, equities: 45, bonds: 20, real_assets: 5 },
    dynamic: { cash: 5, savings: 10, equities: 65, bonds: 15, real_assets: 5 },
  }[comfort || 'balanced'];

  if (horizonYears && horizonYears <= 3) {
    return {
      cash: baseMix.cash + 5,
      savings: baseMix.savings + 10,
      equities: Math.max(10, baseMix.equities - 15),
      bonds: baseMix.bonds + 5,
      real_assets: baseMix.real_assets,
    };
  }

  if (horizonYears && horizonYears >= 12) {
    return {
      cash: Math.max(3, baseMix.cash - 2),
      savings: Math.max(5, baseMix.savings - 5),
      equities: baseMix.equities + 7,
      bonds: Math.max(10, baseMix.bonds - 3),
      real_assets: baseMix.real_assets + 3,
    };
  }

  return baseMix;
}

function buildLocalAdvice(snapshot) {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const goals = snapshot.goals
    .map((goal) => {
      const remaining = Math.max(0, goal.target - goal.current);
      const requiredMonthly = goal.horizon_months > 0 ? remaining / goal.horizon_months : 0;
      const projectedMonths = goal.monthly_contribution > 0 ? Math.ceil(remaining / goal.monthly_contribution) : null;
      return {
        ...goal,
        remaining,
        requiredMonthly,
        projectedMonths,
        completionPct: goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0,
      };
    })
    .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

  const primaryGoal = goals[0] || null;
  let remainingCapacity = Math.max(0, snapshot.surplus);
  const monthlyPlan = [];

  if (snapshot.emergencyGap > 0 && remainingCapacity > 0) {
    const reserveContribution = Math.min(snapshot.emergencyGap, roundTo50(Math.max(100, remainingCapacity * 0.4)));
    if (reserveContribution > 0) {
      monthlyPlan.push({
        title: 'Renforcer votre matelas de sécurité',
        amount: reserveContribution,
        note: `Objectif ${eur(snapshot.emergencyTarget)}. Il manque encore ${eur(snapshot.emergencyGap)}.`,
      });
      remainingCapacity -= reserveContribution;
    }
  }

  if (snapshot.debtBalance > 0 && remainingCapacity > 0 && (snapshot.averageDebtRate >= 4 || snapshot.emergencyGap === 0)) {
    const debtContribution = Math.min(snapshot.debtBalance, roundTo50(Math.max(50, remainingCapacity * 0.35)));
    if (debtContribution > 0) {
      monthlyPlan.push({
        title: 'Rembourser la dette prioritaire',
        amount: debtContribution,
        note: `Dette totale estimée ${eur(snapshot.debtBalance)}.`,
      });
      remainingCapacity -= debtContribution;
    }
  }

  if (primaryGoal && primaryGoal.remaining > 0 && remainingCapacity > 0) {
    const monthlyNeed = primaryGoal.requiredMonthly > 0 ? primaryGoal.requiredMonthly : remainingCapacity;
    const goalContribution = Math.min(primaryGoal.remaining, roundTo50(Math.max(monthlyNeed, remainingCapacity * 0.45)));
    if (goalContribution > 0) {
      monthlyPlan.push({
        title: `Financer "${primaryGoal.label}"`,
        amount: goalContribution,
        note: primaryGoal.requiredMonthly > 0
          ? `Pour tenir l'échéance, il faut viser ${eur(primaryGoal.requiredMonthly)} par mois.`
          : 'Ajoutez une contribution mensuelle pour obtenir une date cible réaliste.',
      });
      remainingCapacity -= goalContribution;
    }
  }

  if (remainingCapacity > 0) {
    const targetInvestBucket = Object.entries(snapshot.targetMix)
      .filter(([bucket]) => ['equities', 'bonds', 'savings'].includes(bucket))
      .sort((a, b) => ((b[1] - (snapshot.currentMix[b[0]] || 0)) - (a[1] - (snapshot.currentMix[a[0]] || 0))))[0];
    monthlyPlan.push({
      title: `Investir régulièrement vers ${bucketLabels[targetInvestBucket?.[0] || 'equities']}`,
      amount: remainingCapacity,
      note: `Allocation cohérente avec votre profil ${comfortLabels[snapshot.profile.comfort] || 'Équilibré'}.`,
    });
  }

  const actionItems = [];
  if (snapshot.surplus <= 0) {
    actionItems.push(`Réduire les dépenses ou augmenter le revenu d'au moins ${eur(Math.abs(snapshot.surplus) + 150)} pour retrouver une épargne positive.`);
  } else {
    actionItems.push(`Préserver votre capacité mensuelle de ${eur(snapshot.surplus)} avant d'augmenter le niveau de risque.`);
  }
  if (snapshot.emergencyGap > 0) {
    actionItems.push(`Compléter la réserve de sécurité: il manque ${eur(snapshot.emergencyGap)} pour couvrir ${Number(snapshot.profile.emergency_months) || 0} mois de dépenses.`);
  }
  if (snapshot.debtBalance > 0 && snapshot.averageDebtRate >= 4) {
    actionItems.push('Traiter les dettes coûteuses avant de surpondérer les placements risqués.');
  }
  if (primaryGoal) {
    if (primaryGoal.requiredMonthly > 0 && primaryGoal.monthly_contribution < primaryGoal.requiredMonthly) {
      actionItems.push(`Le projet "${primaryGoal.label}" demande environ ${eur(primaryGoal.requiredMonthly)} par mois. Votre effort actuel est insuffisant.`);
    } else if (primaryGoal.requiredMonthly > 0) {
      actionItems.push(`Le projet "${primaryGoal.label}" est atteignable si vous maintenez au moins ${eur(primaryGoal.requiredMonthly)} par mois.`);
    } else {
      actionItems.push(`Définissez une échéance ou une contribution pour "${primaryGoal.label}" afin d'obtenir un plan encore plus précis.`);
    }
  }

  const allocationInsights = Object.entries(snapshot.targetMix)
    .map(([bucket, target]) => ({
      bucket,
      target,
      current: snapshot.currentMix[bucket] || 0,
      gap: target - (snapshot.currentMix[bucket] || 0),
    }))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  return {
    headline: snapshot.surplus > 0
      ? `Vous pouvez piloter environ ${eur(snapshot.surplus)} par mois.`
      : `Votre budget est en tension de ${eur(Math.abs(snapshot.surplus))} par mois.`,
    summary: snapshot.netWorth > 0
      ? `Patrimoine net estimé à ${eur(snapshot.netWorth)}, dont ${eur(snapshot.liquidAssets)} immédiatement mobilisables.`
      : `Patrimoine net estimé à ${eur(snapshot.netWorth)}. La priorité est de stabiliser la base budgétaire.`,
    goals,
    primaryGoal,
    monthlyPlan,
    actionItems,
    allocationInsights,
  };
}

function buildAdviceHtml(snapshot, plan, remoteAdvice, remoteStatus = '') {
  const metrics = [
    { label: 'Capacité mensuelle', value: eur(snapshot.surplus) },
    { label: 'Patrimoine net', value: eur(snapshot.netWorth) },
    { label: 'Taux d’épargne', value: pct(snapshot.savingsRate) },
    { label: 'Projet prioritaire', value: plan.primaryGoal ? escapeHtml(plan.primaryGoal.label) : 'À définir' },
  ];

  const monthlyPlanHtml = plan.monthlyPlan.length
    ? `<ol class="advice-list">${plan.monthlyPlan.map((item) => `<li><strong>${escapeHtml(item.title)}</strong> · <span class="amount">${eur(item.amount)}</span><br><span class="advice-note">${escapeHtml(item.note)}</span></li>`).join('')}</ol>`
    : `<p>Pas de capacité disponible à répartir ce mois-ci. Le levier prioritaire est budgétaire.</p>`;

  const goalHtml = plan.goals.length
    ? `<div class="advice-chip-row">${plan.goals.map((goal) => {
      const timing = goal.requiredMonthly > 0 ? `Besoin ${eur(goal.requiredMonthly)}/mois` : 'Échéance à préciser';
      return `<span class="advice-chip">${escapeHtml(goal.label)} · ${goal.completionPct.toFixed(0)} % · ${escapeHtml(timing)}</span>`;
    }).join('')}</div>`
    : '<p>Ajoutez un objectif détaillé pour obtenir un plan plus fin.</p>';

  const allocationHtml = snapshot.totalForMix > 0
    ? `<ul class="advice-list">${plan.allocationInsights.slice(0, 3).map((item) => `
      <li><strong>${bucketLabels[item.bucket] || item.bucket}</strong> · actuel ${pct(item.current)} · cible ${pct(item.target)}${Math.abs(item.gap) >= 3 ? ` · écart ${item.gap > 0 ? '+' : ''}${pct(item.gap)}` : ''}</li>
    `).join('')}</ul>`
    : '<p>Ajoutez vos comptes et placements pour obtenir une allocation vraiment personnalisée.</p>';

  const remoteHtml = remoteAdvice
    ? `<div class="advice-panel"><h4>Lecture IA temps réel</h4><div class="advice-remote">${remoteAdvice}</div></div>`
    : remoteStatus
      ? `<div class="advice-panel"><h4>Lecture IA temps réel</h4><p class="advice-note">${escapeHtml(remoteStatus)}</p></div>`
      : '';

  return `
    <div class="advice-board">
      <div class="advice-hero">
        <h4>${escapeHtml(plan.headline)}</h4>
        <p>${escapeHtml(plan.summary)}</p>
      </div>
      <div class="advice-metrics">
        ${metrics.map((metric) => `
          <div class="advice-metric">
            <span class="advice-metric-label">${escapeHtml(metric.label)}</span>
            <span class="advice-metric-value">${metric.value}</span>
          </div>
        `).join('')}
      </div>
      <div class="advice-grid">
        <div class="advice-panel">
          <h4>Plan du mois</h4>
          ${monthlyPlanHtml}
        </div>
        <div class="advice-panel">
          <h4>Points de vigilance</h4>
          <ul class="advice-list">
            ${plan.actionItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
        <div class="advice-panel">
          <h4>Objectifs</h4>
          ${goalHtml}
        </div>
        <div class="advice-panel">
          <h4>Allocation suggérée</h4>
          <p>Profil ${escapeHtml(comfortLabels[snapshot.profile.comfort] || 'Équilibré')} · horizon ${Number(snapshot.profile.investment_horizon_years) || 0} an(s).</p>
          ${allocationHtml}
        </div>
      </div>
      ${remoteHtml}
    </div>
  `;
}

async function getRemoteAdvice(snapshot, plan, requestVersion) {
  try {
    const { data, error } = await supabase.functions.invoke('finance-advisor', {
      body: {
        profile: snapshot.profile,
        accounts: state.accounts,
        goals: state.goals,
        snapshot,
        plan,
      },
    });
    if (requestVersion !== adviceRequestVersion) return { advice: null, error: '' };
    if (error) return { advice: null, error: error.message || 'IA distante indisponible.' };
    if (!data?.advice) return { advice: null, error: data?.error || 'La function finance-advisor ne renvoie pas encore de conseil.' };
    return { advice: data.advice, error: '' };
  } catch {
    return { advice: null, error: 'Impossible de joindre la function finance-advisor.' };
  }
}

// ── MARKET DATA ───────────────────────────────
async function fetchMarketData() {
  const ticker = document.getElementById('market-ticker');
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/finance-market`, {
      headers: { apikey: SUPABASE_ANON },
    });
    const data = await res.json();
    if (!Array.isArray(data)) return;

    ticker.innerHTML = data.filter(d => !d.error).map((d, i) => `
      ${i > 0 ? '<span class="ticker-sep">·</span>' : ''}
      <div class="ticker-item">
        <span class="ticker-label">${d.label}</span>
        <span class="ticker-price">${formatMarketPrice(d)}</span>
        <span class="ticker-change ${d.change >= 0 ? 'up' : 'down'}">${d.change >= 0 ? '+' : ''}${(+d.change).toFixed(2)} %</span>
      </div>
    `).join('');
  } catch {
    ticker.innerHTML = `<span class="ticker-loading">Marchés indisponibles</span>`;
  }
}

function formatMarketPrice(d) {
  if (d.id === 'EURUSD') return `${(+d.price).toFixed(4)}`;
  if (d.id === 'BTC') return eur(d.price);
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(d.price);
}

// ── FAMILY ────────────────────────────────────
function renderSidebar() {
  const fam = document.getElementById('sidebar-family');
  fam.hidden = false;
  const list = document.getElementById('family-members-list');
  if (state.familyMembers.length) {
    list.innerHTML = state.familyMembers.map(m =>
      `<div class="family-member-row"><span class="member-dot"></span>${m.display_name || 'Membre'}</div>`
    ).join('');
  } else {
    list.innerHTML = `<p style="color:var(--muted);font-size:.82rem;margin:0 0 .6rem">Pas encore de famille créée.</p>`;
  }
}

function renderFamily() {
  const switcher = document.getElementById('family-switcher');
  switcher.hidden = !state.family;
}

document.getElementById('create-family-btn').addEventListener('click', async () => {
  const dialog = document.getElementById('family-dialog');
  document.getElementById('family-dialog-title').textContent = 'Créer une famille';
  const name = prompt('Nom de votre famille (ex: Famille Saez)');
  if (!name) return;
  const { data, error } = await supabase.rpc('create_family', { p_name: name });
  if (error || !data) { alert('Erreur : ' + (error?.message || 'inconnu')); return; }
  state.family = data;
  state.profile.family_id = data.id;
  state.familyMembers = [{ id: state.user.id, display_name: state.profile.display_name }];
  renderSidebar();
  renderFamily();

  // Show invite code
  document.getElementById('family-dialog-title').textContent = 'Famille créée !';
  document.getElementById('family-dialog-content').innerHTML = `
    <p style="color:var(--text-soft);margin:0 0 1rem">Partagez ce code à vos proches pour qu'ils rejoignent votre espace famille :</p>
    <div class="family-code-display">
      <div class="family-code">${data.invite_code}</div>
      <div class="family-code-hint">À saisir lors de la création de compte</div>
    </div>
    <div style="margin-top:1rem;display:flex;justify-content:flex-end">
      <button class="primary-button" onclick="document.getElementById('family-dialog').close()">Fermer</button>
    </div>
  `;
  dialog.showModal();
});

document.getElementById('join-family-btn').addEventListener('click', () => {
  const dialog = document.getElementById('family-dialog');
  document.getElementById('family-dialog-title').textContent = 'Rejoindre une famille';
  document.getElementById('family-dialog-content').innerHTML = `
    <div class="join-form">
      <p style="color:var(--text-soft);margin:0">Entrez le code famille partagé par un proche :</p>
      <input id="join-code-input" type="text" maxlength="8" placeholder="XXXXXXXX">
      <div style="display:flex;justify-content:flex-end;gap:.6rem">
        <button class="ghost-button" onclick="document.getElementById('family-dialog').close()">Annuler</button>
        <button class="primary-button" id="confirm-join-btn">Rejoindre</button>
      </div>
    </div>
  `;
  dialog.showModal();
  document.getElementById('confirm-join-btn').addEventListener('click', async () => {
    const code = document.getElementById('join-code-input').value.trim().toUpperCase();
    if (!code) return;
    await joinFamilyByCode(code, state.user.id);
    dialog.close();
  });
});

async function joinFamilyByCode(code, userId) {
  const { data: fam, error } = await supabase.rpc('join_family_by_code', { p_code: code });
  if (error || !fam) {
    alert(error?.message || 'Code famille invalide.');
    return;
  }
  if (state.user?.id === userId) {
    state.family = fam;
    state.profile.family_id = fam.id;
    await loadAll();
    renderSidebar();
    renderFamily();
  }
}

// ── DIALOG CLOSE ─────────────────────────────
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.close).close());
});

// ── HELPERS ───────────────────────────────────
function flashBtn(btn, text) {
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = orig; }, 1800);
}
