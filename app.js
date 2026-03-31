const STORAGE_KEY = "capital-pilot-state-v1";

const strategyPresets = {
  security: {
    label: "Securite",
    description: "Priorise la tresorerie et la stabilite avant la performance.",
    target: { cash: 46, bonds: 34, equities: 15, real_assets: 5 },
  },
  balanced: {
    label: "Equilibre",
    description: "Mix polyvalent pour faire croitre le capital sans perdre la flexibilite.",
    target: { cash: 22, bonds: 23, equities: 45, real_assets: 10 },
  },
  growth: {
    label: "Croissance",
    description: "Accent sur les actifs de croissance pour un horizon long.",
    target: { cash: 12, bonds: 10, equities: 68, real_assets: 10 },
  },
  income: {
    label: "Revenus",
    description: "Renforce les poches distributives et le portage obligataire.",
    target: { cash: 16, bonds: 38, equities: 28, real_assets: 18 },
  },
  property: {
    label: "Projet immobilier",
    description: "Preserve l'apport et reduit le risque a court et moyen terme.",
    target: { cash: 38, bonds: 28, equities: 24, real_assets: 10 },
  },
};

const bucketLabels = {
  cash: "Tresorerie",
  bonds: "Obligataire",
  equities: "Actions",
  real_assets: "Actifs reels",
};

const accountBucketLabels = {
  cash: "Cash",
  savings: "Epargne liquide",
  equities: "Actions / ETF",
  bonds: "Obligataire / fonds euro",
  real_assets: "Immobilier / reels",
  debt: "Dette",
};

const priorityLabels = {
  critical: "Critique",
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
};

const defaultState = {
  meta: {
    owner: "Valentin",
    lastReview: "2026-03-31",
    nextReview: "2026-04-05",
  },
  assistant: {
    monthlyIncome: 4200,
    monthlyExpenses: 2410,
    currentSavings: 18000,
    projectLabel: "Acheter ma residence principale",
    projectType: "property",
    projectTarget: 50000,
    projectYears: 4,
    comfort: "balanced",
  },
  profile: {
    monthlyIncome: 4200,
    fixedCosts: 1650,
    variableCosts: 760,
    debtPayments: 230,
    emergencyMonths: 6,
    investmentHorizonYears: 12,
    targetSavingsRate: 25,
  },
  strategy: {
    mode: "balanced",
    objective: "capitalisation",
    monthlyInvestableCash: 950,
    maxEquity: 65,
    rebalanceBand: 5,
    debtRule: "hybrid",
    housingProjectYears: 4,
  },
  accounts: [
    {
      id: "acc-bank",
      label: "Compte courant",
      bucket: "cash",
      balance: 8200,
      rate: 0.4,
      wrapper: "Banque principale",
    },
    {
      id: "acc-livret",
      label: "Livret A",
      bucket: "savings",
      balance: 14800,
      rate: 3,
      wrapper: "Livret",
    },
    {
      id: "acc-pea",
      label: "PEA ETF Monde",
      bucket: "equities",
      balance: 18600,
      rate: 0,
      wrapper: "PEA",
    },
    {
      id: "acc-av",
      label: "Assurance-vie fonds euro",
      bucket: "bonds",
      balance: 12300,
      rate: 2.7,
      wrapper: "Assurance-vie",
    },
    {
      id: "acc-scpi",
      label: "SCPI / immobilier papier",
      bucket: "real_assets",
      balance: 6800,
      rate: 4.4,
      wrapper: "SCPI",
    },
    {
      id: "acc-loan",
      label: "Credit auto",
      bucket: "debt",
      balance: -6400,
      rate: 4.9,
      wrapper: "Credit amortissable",
    },
  ],
  goals: [
    {
      id: "goal-emergency",
      label: "Fonds de securite",
      target: 15840,
      current: 14800,
      monthlyContribution: 250,
      horizonMonths: 4,
      priority: "critical",
    },
    {
      id: "goal-home",
      label: "Apport immobilier",
      target: 50000,
      current: 18000,
      monthlyContribution: 400,
      horizonMonths: 48,
      priority: "high",
    },
    {
      id: "goal-retire",
      label: "Retraite long terme",
      target: 250000,
      current: 37700,
      monthlyContribution: 300,
      horizonMonths: 240,
      priority: "medium",
    },
  ],
  routines: {
    weeklyReviewDay: "Dimanche",
    monthlyCloseDay: 1,
    alerts: [
      "Verifier la tresorerie disponible sur 30 jours",
      "Controler la derive de l'allocation vs la cible",
      "Revoir l'objectif immobilier si l'horizon change",
    ],
  },
};

const assumptions = {
  cash: 2.5,
  bonds: 3.2,
  equities: 6.8,
  real_assets: 4.5,
};

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const number = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

const longDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
});

const refs = {
  assistantForm: document.getElementById("assistant-form"),
  assistantSummary: document.getElementById("assistant-summary"),
  kpiGrid: document.getElementById("kpi-grid"),
  overviewMeta: document.getElementById("overview-meta"),
  statusContent: document.getElementById("status-content"),
  heroSummary: document.getElementById("hero-summary"),
  monthlyPlan: document.getElementById("monthly-plan"),
  recommendationList: document.getElementById("recommendation-list"),
  cashflowForm: document.getElementById("cashflow-form"),
  cashflowBreakdown: document.getElementById("cashflow-breakdown"),
  allocationChart: document.getElementById("allocation-chart"),
  allocationDrifts: document.getElementById("allocation-drifts"),
  goalsList: document.getElementById("goals-list"),
  strategyForm: document.getElementById("strategy-form"),
  strategyInsights: document.getElementById("strategy-insights"),
  accountsBody: document.getElementById("accounts-body"),
  ritualContent: document.getElementById("ritual-content"),
  scenarioContent: document.getElementById("scenario-content"),
  installButton: document.getElementById("install-button"),
  accountDialog: document.getElementById("account-dialog"),
  accountForm: document.getElementById("account-form"),
  goalDialog: document.getElementById("goal-dialog"),
  goalForm: document.getElementById("goal-form"),
  addAccountButton: document.getElementById("add-account-button"),
  addGoalButton: document.getElementById("add-goal-button"),
};

let state = loadState();
let installPrompt = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return clone(defaultState);
    }

    const parsed = JSON.parse(saved);
    return {
      ...clone(defaultState),
      ...parsed,
      meta: { ...clone(defaultState.meta), ...(parsed.meta || {}) },
      assistant: { ...clone(defaultState.assistant), ...(parsed.assistant || {}) },
      profile: { ...clone(defaultState.profile), ...(parsed.profile || {}) },
      strategy: { ...clone(defaultState.strategy), ...(parsed.strategy || {}) },
      routines: { ...clone(defaultState.routines), ...(parsed.routines || {}) },
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : clone(defaultState.accounts),
      goals: Array.isArray(parsed.goals) ? parsed.goals : clone(defaultState.goals),
    };
  } catch (error) {
    return clone(defaultState);
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function assistantProjectTypeLabel(value) {
  const labels = {
    property: "Acheter un bien",
    capitalisation: "Faire grandir mon argent",
    retirement: "Preparer ma retraite",
    safety: "Construire un matelas de securite",
    income: "Chercher plus de revenu",
  };
  return labels[value] || value;
}

function assistantComfortLabel(value) {
  const labels = {
    safe: "Prudent",
    balanced: "Equilibre",
    dynamic: "Dynamique",
  };
  return labels[value] || value;
}

function buildAutoAccounts(totalSavings, targetAllocation, reserveTarget, projectType) {
  const safeSavings = Math.max(0, totalSavings);
  if (!safeSavings) {
    return [
      {
        id: "acc-auto-cash",
        label: "Tresorerie principale",
        bucket: "cash",
        balance: 0,
        rate: 2.5,
        wrapper: "Poche automatique",
      },
    ];
  }

  let cashBalance = Math.min(
    safeSavings,
    Math.max(reserveTarget, safeSavings * ((targetAllocation.cash || 0) / 100)),
  );

  if (projectType === "property" || projectType === "safety") {
    cashBalance = Math.min(safeSavings, Math.max(cashBalance, safeSavings * 0.6));
  }

  const remaining = Math.max(0, safeSavings - cashBalance);
  const otherWeights = normalizeWeights({
    bonds: targetAllocation.bonds || 0,
    equities: targetAllocation.equities || 0,
    real_assets: targetAllocation.real_assets || 0,
  });
  const split = distributeAmount(round(remaining), otherWeights);

  return [
    {
      id: "acc-auto-cash",
      label: projectType === "property" ? "Poche projet + securite" : "Tresorerie principale",
      bucket: "cash",
      balance: cashBalance,
      rate: 2.5,
      wrapper: "Poche automatique",
    },
    {
      id: "acc-auto-bonds",
      label: "Poche prudente",
      bucket: "bonds",
      balance: split.bonds || 0,
      rate: 3.2,
      wrapper: "Support prudent",
    },
    {
      id: "acc-auto-equities",
      label: "Poche croissance",
      bucket: "equities",
      balance: split.equities || 0,
      rate: 6.8,
      wrapper: "ETF / diversification",
    },
    {
      id: "acc-auto-real",
      label: "Poche projet long terme",
      bucket: "real_assets",
      balance: split.real_assets || 0,
      rate: 4.5,
      wrapper: "Actifs reels",
    },
  ].filter((account) => account.balance > 0 || account.bucket === "cash");
}

function applyAssistantModel() {
  const assistant = state.assistant || clone(defaultState.assistant);
  const income = Math.max(0, Number(assistant.monthlyIncome) || 0);
  const expenses = Math.max(0, Number(assistant.monthlyExpenses) || 0);
  const savings = Math.max(0, Number(assistant.currentSavings) || 0);
  const projectYears = Math.max(1, Number(assistant.projectYears) || 1);
  const projectTarget = Math.max(0, Number(assistant.projectTarget) || 0);
  const projectType = assistant.projectType || "capitalisation";
  const comfort = assistant.comfort || "balanced";
  const comfortSettings = {
    safe: { mode: "security", maxEquity: 35, emergencyMonths: 6, rebalanceBand: 4 },
    balanced: { mode: "balanced", maxEquity: 60, emergencyMonths: 5, rebalanceBand: 5 },
    dynamic: { mode: "growth", maxEquity: 80, emergencyMonths: 4, rebalanceBand: 7 },
  }[comfort] || { mode: "balanced", maxEquity: 60, emergencyMonths: 5, rebalanceBand: 5 };

  const objectiveByProject = {
    property: "property",
    capitalisation: "capitalisation",
    retirement: "retirement",
    safety: "stability",
    income: "income",
  };

  const monthlySurplus = Math.max(0, income - expenses);
  const fixedCosts = round(expenses * 0.68);
  const variableCosts = Math.max(0, expenses - fixedCosts);

  state.profile.monthlyIncome = income;
  state.profile.fixedCosts = fixedCosts;
  state.profile.variableCosts = variableCosts;
  state.profile.debtPayments = 0;
  state.profile.targetSavingsRate = income > 0 ? clamp(round((monthlySurplus / income) * 100), 5, 45) : 0;
  state.profile.emergencyMonths = comfortSettings.emergencyMonths + (projectType === "safety" ? 1 : 0);
  state.profile.investmentHorizonYears = projectType === "retirement" ? Math.max(12, projectYears) : projectYears;

  state.strategy.mode = projectType === "property" ? "property" : comfortSettings.mode;
  state.strategy.objective = objectiveByProject[projectType] || "capitalisation";
  state.strategy.monthlyInvestableCash = round(monthlySurplus);
  state.strategy.maxEquity = comfortSettings.maxEquity;
  state.strategy.rebalanceBand = comfortSettings.rebalanceBand;
  state.strategy.debtRule = "minimum";
  state.strategy.housingProjectYears = projectType === "property" ? projectYears : 8;

  const reserveTarget = expenses * state.profile.emergencyMonths;
  const targetAllocation = getTargetAllocation(state);
  state.accounts = buildAutoAccounts(savings, targetAllocation, reserveTarget, projectType);

  const monthlyReserveContribution =
    savings >= reserveTarget ? round(monthlySurplus * 0.1) : round(monthlySurplus * 0.35);
  const monthlyProjectContribution = round(
    monthlySurplus * (projectType === "retirement" ? 0.5 : projectType === "property" ? 0.55 : 0.4),
  );
  const monthlyLongTermContribution = Math.max(
    0,
    round(monthlySurplus - monthlyReserveContribution - monthlyProjectContribution),
  );

  const reserveCurrent = Math.min(savings, reserveTarget);
  const primaryGoalCurrent = Math.min(
    projectTarget,
    projectType === "safety" ? reserveCurrent : Math.max(0, savings - reserveCurrent),
  );

  const primaryGoalLabel = assistant.projectLabel?.trim() || assistantProjectTypeLabel(projectType);

  state.goals = [
    {
      id: "goal-security",
      label: "Matelas de securite",
      target: reserveTarget,
      current: reserveCurrent,
      monthlyContribution: Math.max(0, monthlyReserveContribution),
      horizonMonths: Math.max(1, state.profile.emergencyMonths * 6),
      priority: "critical",
    },
    {
      id: "goal-main",
      label: primaryGoalLabel,
      target: projectTarget || reserveTarget,
      current: primaryGoalCurrent,
      monthlyContribution: Math.max(0, monthlyProjectContribution),
      horizonMonths: Math.max(1, projectYears * 12),
      priority: "high",
    },
  ];

  if (projectType !== "retirement") {
    state.goals.push({
      id: "goal-long-term",
      label: "Capital long terme",
      target: Math.max(60000, savings + monthlyLongTermContribution * 120),
      current: Math.max(0, savings - primaryGoalCurrent),
      monthlyContribution: Math.max(0, monthlyLongTermContribution),
      horizonMonths: 120,
      priority: "medium",
    });
  }

  state.routines.alerts = [
    `Verifier que ${currency.format(Math.max(0, monthlySurplus))} restent bien disponibles chaque mois`,
    `Comparer la poche projet a l'objectif ${primaryGoalLabel.toLowerCase()}`,
    "Controler une fois par semaine que les depenses n'ont pas derive",
  ];
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value);
}

function formatDate(value) {
  return longDate.format(new Date(value));
}

function mappedBucket(bucket) {
  return bucket === "savings" ? "cash" : bucket;
}

function normalizeWeights(weights) {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (!total) {
    return weights;
  }

  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, (value / total) * 100]),
  );
}

function distributeAmount(total, weights) {
  const entries = Object.entries(weights).filter(([, value]) => value > 0);
  const totalWeight = entries.reduce((sum, [, value]) => sum + value, 0);
  if (!entries.length || !totalWeight || total <= 0) {
    return {};
  }

  const raw = entries.map(([key, value]) => ({
    key,
    value: (value / totalWeight) * total,
  }));
  const rounded = raw.map((item) => ({
    key: item.key,
    value: Math.floor(item.value),
    remainder: item.value - Math.floor(item.value),
  }));

  let missing = total - rounded.reduce((sum, item) => sum + item.value, 0);
  rounded
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((item) => {
      if (missing <= 0) {
        return;
      }
      item.value += 1;
      missing -= 1;
    });

  return Object.fromEntries(
    rounded
      .filter((item) => item.value > 0)
      .map((item) => [item.key, item.value]),
  );
}

function getTargetAllocation(currentState) {
  const preset = strategyPresets[currentState.strategy.mode] || strategyPresets.balanced;
  const target = { ...preset.target };

  if (currentState.strategy.objective === "income") {
    target.bonds += 5;
    target.equities -= 3;
    target.cash -= 2;
  }

  if (currentState.strategy.objective === "retirement" && currentState.profile.investmentHorizonYears >= 10) {
    target.equities += 5;
    target.cash -= 3;
    target.bonds -= 2;
  }

  if (
    currentState.strategy.objective === "property" ||
    currentState.strategy.housingProjectYears <= 5
  ) {
    target.cash += 6;
    target.bonds += 4;
    target.equities -= 8;
    target.real_assets -= 2;
  }

  const equityCap = clamp(currentState.strategy.maxEquity, 10, 90);
  if (target.equities > equityCap) {
    const delta = target.equities - equityCap;
    target.equities = equityCap;
    target.bonds += delta * 0.6;
    target.cash += delta * 0.4;
  }

  return normalizeWeights(target);
}

function computeMetrics(currentState) {
  const income = Number(currentState.profile.monthlyIncome) || 0;
  const fixedCosts = Number(currentState.profile.fixedCosts) || 0;
  const variableCosts = Number(currentState.profile.variableCosts) || 0;
  const debtPayments = Number(currentState.profile.debtPayments) || 0;
  const monthlyBurn = fixedCosts + variableCosts + debtPayments;
  const monthlySurplus = income - monthlyBurn;
  const targetSavingsRate = (Number(currentState.profile.targetSavingsRate) || 0) / 100;
  const emergencyMonths = Number(currentState.profile.emergencyMonths) || 0;

  const positiveAccounts = currentState.accounts.filter((account) => Number(account.balance) >= 0);
  const debtAccounts = currentState.accounts.filter((account) => account.bucket === "debt");

  const positiveAssets = positiveAccounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const debtTotal = debtAccounts.reduce((sum, account) => sum + Math.abs(Number(account.balance)), 0);
  const netWorth = positiveAssets - debtTotal;
  const liquidAssets = currentState.accounts
    .filter((account) => account.bucket === "cash" || account.bucket === "savings")
    .reduce((sum, account) => sum + Number(account.balance), 0);
  const reserveTarget = monthlyBurn * emergencyMonths;
  const reserveGap = Math.max(0, reserveTarget - liquidAssets);
  const idleCash = Math.max(0, liquidAssets - reserveTarget * 1.15);
  const runwayMonths = monthlyBurn > 0 ? liquidAssets / monthlyBurn : 0;
  const savingsRate = income > 0 ? monthlySurplus / income : 0;

  const portfolioTotals = { cash: 0, bonds: 0, equities: 0, real_assets: 0 };
  positiveAccounts.forEach((account) => {
    portfolioTotals[mappedBucket(account.bucket)] += Number(account.balance);
  });

  const investableTotal = Object.values(portfolioTotals).reduce((sum, value) => sum + value, 0);
  const currentAllocation = investableTotal
    ? Object.fromEntries(
        Object.entries(portfolioTotals).map(([key, value]) => [key, (value / investableTotal) * 100]),
      )
    : { cash: 0, bonds: 0, equities: 0, real_assets: 0 };

  const targetAllocation = getTargetAllocation(currentState);
  const allocationGaps = Object.fromEntries(
    Object.keys(targetAllocation).map((key) => [key, targetAllocation[key] - (currentAllocation[key] || 0)]),
  );

  const expectedReturn = Object.entries(currentAllocation).reduce(
    (sum, [key, value]) => sum + (value / 100) * assumptions[key],
    0,
  );
  const riskScore = clamp(
    round(
      currentAllocation.equities * 0.95 +
        currentAllocation.real_assets * 0.7 +
        currentAllocation.bonds * 0.32 +
        currentAllocation.cash * 0.1,
    ),
    0,
    100,
  );

  const goalStatus = currentState.goals.map((goal) => {
    const progress = goal.target > 0 ? clamp(goal.current / goal.target, 0, 1.5) : 0;
    const requiredMonthly = Math.max(0, (goal.target - goal.current) / Math.max(goal.horizonMonths, 1));
    const paceGap = Math.max(0, requiredMonthly - goal.monthlyContribution);
    return {
      ...goal,
      progress,
      requiredMonthly,
      paceGap,
      health:
        progress >= 1
          ? "ahead"
          : paceGap <= 0
            ? "ontrack"
            : paceGap / Math.max(requiredMonthly, 1) > 0.35
              ? "late"
              : "watch",
    };
  });

  return {
    income,
    monthlyBurn,
    monthlySurplus,
    targetSavingsRate,
    netWorth,
    liquidAssets,
    reserveTarget,
    reserveGap,
    idleCash,
    runwayMonths,
    savingsRate,
    currentAllocation,
    targetAllocation,
    allocationGaps,
    investableTotal,
    expectedReturn,
    riskScore,
    portfolioTotals,
    goalStatus,
    debtAccounts,
  };
}

function getDestinationLabel(bucket, currentState) {
  if (bucket === "cash") {
    return currentState.strategy.objective === "property" ? "Livret / poche apport" : "Livret A / LDDS";
  }
  if (bucket === "bonds") {
    return "Assurance-vie / fonds euro";
  }
  if (bucket === "equities") {
    return "PEA / ETF global large cap";
  }
  return "Immobilier papier / poche reelle";
}

function buildMonthlyPlan(currentState, metrics) {
  let remaining = Math.max(0, Math.min(metrics.monthlySurplus, currentState.strategy.monthlyInvestableCash));
  const plan = [];

  if (remaining <= 0) {
    return plan;
  }

  if (metrics.reserveGap > 0) {
    const reserveShare = Math.min(round(remaining * 0.45), metrics.reserveGap);
    if (reserveShare > 0) {
      remaining -= reserveShare;
      plan.push({
        label: "Renforcer le matelas de securite",
        amount: reserveShare,
        bucket: "cash",
        destination: getDestinationLabel("cash", currentState),
      });
    }
  }

  const expensiveDebt = metrics.debtAccounts
    .filter((account) => Number(account.rate) >= 4)
    .sort((left, right) => Number(right.rate) - Number(left.rate))[0];

  if (expensiveDebt && currentState.strategy.debtRule !== "minimum" && remaining > 0) {
    const debtShare = Math.min(round(remaining * (currentState.strategy.debtRule === "avalanche" ? 0.45 : 0.25)), Math.abs(Number(expensiveDebt.balance)));
    if (debtShare > 0) {
      remaining -= debtShare;
      plan.push({
        label: "Remboursement anticipe",
        amount: debtShare,
        bucket: "debt",
        destination: expensiveDebt.label,
      });
    }
  }

  if (remaining > 0 && currentState.strategy.objective === "property" && currentState.strategy.housingProjectYears <= 5) {
    const propertyShare = round(remaining * 0.3);
    if (propertyShare > 0) {
      remaining -= propertyShare;
      plan.push({
        label: "Flacher l'apport immobilier",
        amount: propertyShare,
        bucket: "cash",
        destination: "Poche apport / livret",
      });
    }
  }

  if (remaining > 0) {
    const positiveGaps = Object.fromEntries(
      Object.entries(metrics.allocationGaps).filter(([, gap]) => gap > 0.5),
    );
    const weights = Object.keys(positiveGaps).length ? positiveGaps : metrics.targetAllocation;
    const split = distributeAmount(round(remaining), weights);
    Object.entries(split).forEach(([bucket, amount]) => {
      plan.push({
        label: `Alimenter la poche ${bucketLabels[bucket].toLowerCase()}`,
        amount,
        bucket,
        destination: getDestinationLabel(bucket, currentState),
      });
    });
  }

  return plan;
}

function generateRecommendations(currentState, metrics, plan) {
  const recommendations = [];

  if (metrics.monthlySurplus <= 0) {
    recommendations.push({
      priority: "critical",
      title: "Depenser un peu moins chaque mois",
      detail: `En ce moment, il manque ${currency.format(Math.abs(metrics.monthlySurplus))} pour finir le mois sans stress.`,
      action: `Avant d'investir, retrouve au moins ${currency.format(Math.abs(metrics.monthlySurplus) + 150)} de marge.`,
    });
  } else {
    if (metrics.reserveGap > 0) {
      const topUp = Math.min(round(metrics.monthlySurplus * 0.45), metrics.reserveGap);
      recommendations.push({
        priority: "critical",
        title: "Completer d'abord la reserve de securite",
        detail: `Il manque ${currency.format(metrics.reserveGap)} pour avoir ${number.format(currentState.profile.emergencyMonths)} mois de depenses de cote.`,
        action: `Mets ${currency.format(topUp)} par mois sur la poche securite jusqu'au bon niveau.`,
      });
    }

    const expensiveDebt = metrics.debtAccounts
      .filter((account) => Number(account.rate) >= 4)
      .sort((left, right) => Number(right.rate) - Number(left.rate))[0];

    if (expensiveDebt && currentState.strategy.debtRule !== "minimum") {
      recommendations.push({
        priority: "high",
        title: "Remettre un peu plus sur la dette chere",
        detail: `${expensiveDebt.label} coute ${number.format(Number(expensiveDebt.rate))} % par an.`,
        action: "Tant que ce taux reste eleve, mieux vaut la ralentir avant de prendre plus de risque.",
      });
    }

    if (metrics.idleCash > 2000) {
      const largestPositiveGap =
        Object.entries(metrics.allocationGaps).sort((left, right) => right[1] - left[1])[0] || [];
      recommendations.push({
        priority: "high",
        title: "Utiliser l'argent qui dort",
        detail: `${currency.format(metrics.idleCash)} restent au-dessus du matelas de securite cible.`,
        action: `Dirige cette somme en priorite vers ${bucketLabels[largestPositiveGap[0] || "equities"].toLowerCase()} via ${getDestinationLabel(largestPositiveGap[0] || "equities", currentState)}.`,
      });
    }

    const strongestGap = Object.entries(metrics.allocationGaps)
      .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))[0];

    if (strongestGap && Math.abs(strongestGap[1]) >= currentState.strategy.rebalanceBand) {
      const direction = strongestGap[1] > 0 ? "sous-ponderee" : "sur-ponderee";
      recommendations.push({
        priority: "medium",
        title: "Remettre le portefeuille dans l'axe",
        detail: `La poche ${bucketLabels[strongestGap[0]].toLowerCase()} est ${direction} de ${number.format(Math.abs(strongestGap[1]))} points.`,
        action: strongestGap[1] > 0
          ? "Les prochains versements doivent aller en priorite sur cette poche."
          : "Mieux vaut ne plus l'alimenter tant qu'elle reste au-dessus de la cible.",
      });
    }
  }

  const laggingGoal = metrics.goalStatus
    .filter((goal) => goal.paceGap > 0)
    .sort((left, right) => right.paceGap - left.paceGap)[0];

  if (laggingGoal) {
    recommendations.push({
      priority: laggingGoal.priority,
      title: `Remettre l'objectif ${laggingGoal.label.toLowerCase()} sur de bons rails`,
      detail: `Il manque ${currency.format(laggingGoal.paceGap)} par mois pour tenir le rythme actuel.`,
      action: "Deux solutions simples: verser un peu plus chaque mois ou laisser plus de temps au projet.",
    });
  }

  if (metrics.savingsRate < metrics.targetSavingsRate && metrics.monthlySurplus > 0) {
    const delta = (metrics.targetSavingsRate - metrics.savingsRate) * metrics.income;
    recommendations.push({
      priority: "medium",
      title: "Augmenter un peu l'epargne mensuelle",
      detail: `Tu es a ${percent.format(metrics.savingsRate)} pour une cible de ${percent.format(metrics.targetSavingsRate)}.`,
      action: `Trouve ${currency.format(delta)} de marge supplementaire par mois pour atteindre la cible.`,
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      priority: "low",
      title: "Le systeme est bien calibre",
      detail: "Le matelas, l'allocation et les objectifs restent coherents avec la situation actuelle.",
      action: `Continue a suivre ce plan mensuel de ${currency.format(plan.reduce((sum, item) => sum + item.amount, 0))}.`,
    });
  }

  return recommendations.slice(0, 6);
}

function buildScenarioPreview(currentState, metrics) {
  const modes = ["security", "balanced", "growth", "income", "property"];
  return modes.map((mode) => {
    const shadowState = clone(currentState);
    shadowState.strategy.mode = mode;
    const shadowMetrics = computeMetrics(shadowState);
    return {
      mode,
      label: strategyPresets[mode].label,
      description: strategyPresets[mode].description,
      target: shadowMetrics.targetAllocation,
      expectedReturn: shadowMetrics.expectedReturn,
      riskScore: shadowMetrics.riskScore,
    };
  });
}

function render() {
  applyAssistantModel();
  const metrics = computeMetrics(state);
  const monthlyPlan = buildMonthlyPlan(state, metrics);
  const recommendations = generateRecommendations(state, metrics, monthlyPlan);
  const scenarioPreview = buildScenarioPreview(state, metrics);

  renderAssistant(metrics, monthlyPlan);
  renderHeader(metrics);
  renderKpis(metrics);
  renderPlan(monthlyPlan, metrics);
  renderRecommendations(recommendations);
  renderForms();
  renderCashflow(metrics);
  renderAllocation(metrics);
  renderGoals(metrics);
  renderAccounts();
  renderStrategy(metrics, scenarioPreview);
  renderRitual(metrics, scenarioPreview);
  animateBars();
}

function renderAssistant(metrics, monthlyPlan) {
  populateForm(refs.assistantForm, {
    "assistant.monthlyIncome": state.assistant.monthlyIncome,
    "assistant.monthlyExpenses": state.assistant.monthlyExpenses,
    "assistant.currentSavings": state.assistant.currentSavings,
    "assistant.projectLabel": state.assistant.projectLabel,
    "assistant.projectType": state.assistant.projectType,
    "assistant.projectTarget": state.assistant.projectTarget,
    "assistant.projectYears": state.assistant.projectYears,
    "assistant.comfort": state.assistant.comfort,
  });

  const primaryGoal = metrics.goalStatus.find((goal) => goal.id === "goal-main") || metrics.goalStatus[0];
  const firstPlan = monthlyPlan[0];

  refs.assistantSummary.innerHTML = `
    <div class="assistant-card-stack">
      <article class="assistant-card assistant-card-strong">
        <p class="panel-kicker">En un coup d'oeil</p>
        <strong>${currency.format(metrics.monthlySurplus)}</strong>
        <p class="microcopy">C'est la somme qui reste chaque mois une fois les depenses payees.</p>
      </article>
      <article class="assistant-card">
        <p class="panel-kicker">Projet compris</p>
        <strong>${primaryGoal.label}</strong>
        <p class="microcopy">${currency.format(primaryGoal.current)} deja de cote sur ${currency.format(primaryGoal.target)} a atteindre en ${number.format(primaryGoal.horizonMonths / 12)} ans.</p>
      </article>
      <article class="assistant-card">
        <p class="panel-kicker">Style retenu</p>
        <strong>${strategyPresets[state.strategy.mode].label}</strong>
        <p class="microcopy">${assistantComfortLabel(state.assistant.comfort)}. ${strategyPresets[state.strategy.mode].description}</p>
      </article>
      <article class="assistant-card">
        <p class="panel-kicker">Priorite du mois</p>
        <strong>${firstPlan ? firstPlan.label : "Reduire les depenses"}</strong>
        <p class="microcopy">${firstPlan ? `${currency.format(firstPlan.amount)} ce mois-ci vers ${firstPlan.destination}.` : "L'app recommande d'abord de recreer de la marge mensuelle."}</p>
      </article>
    </div>
  `;
}

function renderHeader(metrics) {
  refs.heroSummary.innerHTML = `
    <article class="hero-stat">
      <small>Budget libre</small>
      <strong>${currency.format(metrics.monthlySurplus)}</strong>
    </article>
    <article class="hero-stat">
      <small>Epargne mise de cote</small>
      <strong>${currency.format(state.assistant.currentSavings)}</strong>
    </article>
    <article class="hero-stat">
      <small>Projet principal</small>
      <strong>${state.assistant.projectLabel}</strong>
    </article>
  `;

  refs.overviewMeta.innerHTML = [
    statusChip("Mode", strategyPresets[state.strategy.mode].label),
    statusChip("Objectif", objectiveLabel(state.strategy.objective)),
    statusChip("Revue", formatDate(state.meta.lastReview)),
  ].join("");

  refs.statusContent.innerHTML = `
    <div class="ritual-stack">
      ${statusSummary("Prochaine revue", formatDate(state.meta.nextReview))}
      ${statusSummary("Coussin actuel", `${number.format(metrics.runwayMonths)} mois`)}
      ${statusSummary("Style", strategyPresets[state.strategy.mode].label)}
    </div>
  `;
}

function renderKpis(metrics) {
  const items = [
    {
      label: "Patrimoine net",
      value: currency.format(metrics.netWorth),
      note: "Actifs moins dettes",
    },
    {
      label: "Tresorerie liquide",
      value: currency.format(metrics.liquidAssets),
      note: "Cash + epargne disponible",
    },
    {
      label: "Cashflow libre",
      value: currency.format(metrics.monthlySurplus),
      note: "Ce qu'il reste apres le mois",
    },
    {
      label: "Taux d'epargne",
      value: percent.format(metrics.savingsRate),
      note: "Part du revenu mise de cote",
    },
    {
      label: "Rendement cible",
      value: percent.format(metrics.expectedReturn / 100),
      note: "Base sur la composition actuelle",
    },
    {
      label: "Buffer vise",
      value: currency.format(metrics.reserveTarget),
      note: `${number.format(state.profile.emergencyMonths)} mois de depenses`,
    },
  ];

  refs.kpiGrid.innerHTML = items
    .map(
      (item) => `
        <article class="kpi-item">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <span>${item.note}</span>
        </article>
      `,
    )
    .join("");
}

function renderPlan(plan, metrics) {
  const totalPlanned = plan.reduce((sum, item) => sum + item.amount, 0);
  if (!plan.length) {
    refs.monthlyPlan.innerHTML = `<p class="empty-state">Pour l'instant, il n'y a pas de somme a repartir. L'etape prioritaire est de recreer un peu de marge mensuelle.</p>`;
    return;
  }

  refs.monthlyPlan.innerHTML = `
    <div class="plan-stack">
      <article class="plan-item">
        <div class="plan-head">
          <div>
            <p class="panel-kicker">Plan 30 jours</p>
            <strong class="amount">${currency.format(totalPlanned)}</strong>
          </div>
          <small>${currency.format(metrics.monthlySurplus)} de cashflow libre, ${currency.format(state.strategy.monthlyInvestableCash)} deployables</small>
        </div>
      </article>
      ${plan
        .map(
          (item) => `
            <article class="plan-item">
              <div class="plan-head">
                <strong>${item.label}</strong>
                <span class="amount">${currency.format(item.amount)}</span>
              </div>
              <small>${item.destination}</small>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderRecommendations(recommendations) {
  refs.recommendationList.innerHTML = `
    <div class="recommendation-stack">
      ${recommendations
        .map(
          (item) => `
            <article class="recommendation">
              <div class="recommendation-head">
                <span class="priority-badge priority-${item.priority}">${priorityLabels[item.priority]}</span>
                <strong>${item.title}</strong>
              </div>
              <p>${item.detail}</p>
              <small>${item.action}</small>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderForms() {
  if (refs.cashflowForm) {
    populateForm(refs.cashflowForm, {
      "profile.monthlyIncome": state.profile.monthlyIncome,
      "profile.fixedCosts": state.profile.fixedCosts,
      "profile.variableCosts": state.profile.variableCosts,
      "profile.debtPayments": state.profile.debtPayments,
      "profile.targetSavingsRate": state.profile.targetSavingsRate,
      "strategy.monthlyInvestableCash": state.strategy.monthlyInvestableCash,
    });
  }

  if (refs.strategyForm) {
    populateForm(refs.strategyForm, {
      "strategy.mode": state.strategy.mode,
      "strategy.objective": state.strategy.objective,
      "profile.investmentHorizonYears": state.profile.investmentHorizonYears,
      "profile.emergencyMonths": state.profile.emergencyMonths,
      "strategy.maxEquity": state.strategy.maxEquity,
      "strategy.rebalanceBand": state.strategy.rebalanceBand,
      "strategy.debtRule": state.strategy.debtRule,
      "strategy.housingProjectYears": state.strategy.housingProjectYears,
    });
  }
}

function populateForm(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = value;
    }
  });
}

function renderCashflow(metrics) {
  const maxBase = Math.max(metrics.income, metrics.monthlyBurn, metrics.monthlySurplus, 1);
  const rows = [
    { label: "Revenu", value: metrics.income, key: "income" },
    { label: "Depenses", value: metrics.monthlyBurn, key: "burn" },
    { label: "Surplus", value: Math.max(metrics.monthlySurplus, 0), key: "surplus" },
  ];

  refs.cashflowBreakdown.innerHTML = rows
    .map(
      (row) => `
        <div class="waterfall-row">
          <div class="label-row">
            <strong>${row.label}</strong>
            <span>${currency.format(row.value)}</span>
          </div>
          <div class="waterfall-track">
            <div class="waterfall-fill ${row.key}" data-width="${(row.value / maxBase) * 100}%"></div>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderAllocation(metrics) {
  const rows = Object.keys(metrics.targetAllocation).map((bucket) => {
    const current = metrics.currentAllocation[bucket] || 0;
    const target = metrics.targetAllocation[bucket] || 0;
    return `
      <article class="allocation-card">
        <div class="allocation-head">
          <div>
            <strong>${bucketLabels[bucket]}</strong>
            <small>${currency.format(metrics.portfolioTotals[bucket] || 0)}</small>
          </div>
          <small>cible ${number.format(target)} %</small>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${bucket}" data-width="${current}%"></div>
        </div>
        <div class="label-row">
          <small>actuel ${number.format(current)} %</small>
          <small>${number.format(target - current)} pts vs cible</small>
        </div>
      </article>
    `;
  });

  refs.allocationChart.innerHTML = `<div class="allocation-stack">${rows.join("")}</div>`;

  refs.allocationDrifts.innerHTML = `
    <div class="drift-stack">
      <article class="drift-card">
        <p class="panel-kicker">Lecture</p>
        <strong>${strategyPresets[state.strategy.mode].label}</strong>
        <p>${strategyPresets[state.strategy.mode].description}</p>
      </article>
      ${Object.entries(metrics.allocationGaps)
        .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
        .map(([bucket, value]) => {
          const status = value >= 0 ? "positive" : "negative";
          const tone = value >= 0 ? "a renforcer" : "a freiner";
          return `
            <article class="drift-card">
              <div class="label-row">
                <strong>${bucketLabels[bucket]}</strong>
                <span class="drift-value ${status}">${number.format(value)} pts</span>
              </div>
              <small>${tone}</small>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderGoals(metrics) {
  if (!metrics.goalStatus.length) {
    refs.goalsList.innerHTML = `<p class="empty-state">Ajoute un objectif pour suivre une cible financiere.</p>`;
    return;
  }

  refs.goalsList.innerHTML = `
    <div class="goal-stack">
      ${metrics.goalStatus
        .map((goal) => `
          <article class="goal-card">
            <div class="goal-head">
              <div>
                <span class="priority-badge priority-${goal.priority}">${priorityLabels[goal.priority]}</span>
                <strong>${goal.label}</strong>
              </div>
              <div class="table-actions">
                <button class="text-button" data-goal-edit="${goal.id}">Modifier</button>
                <button class="text-button" data-goal-delete="${goal.id}">Supprimer</button>
              </div>
            </div>
            <small>${currency.format(goal.current)} sur ${currency.format(goal.target)} en ${goal.horizonMonths} mois</small>
            <div class="goal-track">
              <div class="goal-fill" data-width="${clamp(goal.progress * 100, 0, 100)}%"></div>
            </div>
            <div class="label-row">
              <small>Contribution ${currency.format(goal.monthlyContribution)} / mois</small>
              <small>Rythme requis ${currency.format(goal.requiredMonthly)} / mois</small>
            </div>
          </article>
        `)
        .join("")}
    </div>
  `;
}

function renderAccounts() {
  refs.accountsBody.innerHTML = state.accounts
    .map(
      (account) => `
        <tr>
          <td>${account.label}</td>
          <td>${accountBucketLabels[account.bucket]}</td>
          <td>${currency.format(Number(account.balance))}</td>
          <td>${number.format(Number(account.rate) || 0)} %</td>
          <td>${account.wrapper || "-"}</td>
          <td>
            <div class="table-actions">
              <button class="text-button" data-account-edit="${account.id}">Modifier</button>
              <button class="text-button" data-account-delete="${account.id}">Supprimer</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderStrategy(metrics, scenarioPreview) {
  const projectionFiveYears = projectCapital(metrics, 60);
  refs.strategyInsights.innerHTML = `
    <div class="scenario-stack">
      <article class="scenario-card">
        <p class="panel-kicker">Projection 5 ans</p>
        <strong>${currency.format(projectionFiveYears.finalValue)}</strong>
        <small>Avec ${currency.format(Math.max(0, Math.min(metrics.monthlySurplus, state.strategy.monthlyInvestableCash)))} investis par mois et ${percent.format(metrics.expectedReturn / 100)} de rendement attendu.</small>
      </article>
      <article class="scenario-card">
        <p class="panel-kicker">Style de portefeuille</p>
        <strong>${metrics.riskScore}/100</strong>
        <small>Score de risque approximatif derive de la part actions et actifs reels.</small>
      </article>
      ${scenarioPreview
        .filter((scenario) => scenario.mode !== state.strategy.mode)
        .slice(0, 3)
        .map(
          (scenario) => `
            <article class="scenario-card">
              <div class="label-row">
                <strong>${scenario.label}</strong>
                <small>${percent.format(scenario.expectedReturn / 100)}</small>
              </div>
              <small>${scenario.description}</small>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderRitual(metrics, scenarioPreview) {
  refs.ritualContent.innerHTML = `
    <div class="ritual-stack">
      <article class="ritual-card">
        <div class="ritual-head">
          <div>
            <p class="panel-kicker">Rituel hebdo</p>
            <strong>15 minutes chaque ${state.routines.weeklyReviewDay.toLowerCase()}</strong>
          </div>
          <small>Prochaine revue: ${formatDate(state.meta.nextReview)}</small>
        </div>
      </article>
      ${state.routines.alerts
        .map(
          (alert) => `
            <article class="ritual-card">
              <small>${alert}</small>
            </article>
          `,
        )
        .join("")}
      <article class="ritual-card">
        <small>Buffer actuel: ${number.format(metrics.runwayMonths)} mois. Objectif: ${number.format(state.profile.emergencyMonths)} mois.</small>
      </article>
    </div>
  `;

  refs.scenarioContent.innerHTML = `
    <div class="scenario-stack">
      <article class="whatif-card">
        <p class="panel-kicker">What-if</p>
        <strong>Comment les conseils changent</strong>
        <small>Passe d'un mode a l'autre pour recalculer la cible et les prochains versements.</small>
      </article>
      ${scenarioPreview
        .map(
          (scenario) => `
            <article class="scenario-card">
              <div class="label-row">
                <strong>${scenario.label}</strong>
                <small>${scenario.mode === state.strategy.mode ? "actif" : "simulation"}</small>
              </div>
              <small>
                Rendement cible ${percent.format(scenario.expectedReturn / 100)}.
                Actions ${number.format(scenario.target.equities)} %.
              </small>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function projectCapital(metrics, months) {
  const monthlyContribution = Math.max(0, Math.min(metrics.monthlySurplus, state.strategy.monthlyInvestableCash));
  const monthlyRate = metrics.expectedReturn / 100 / 12;
  let value = metrics.netWorth;

  for (let month = 0; month < months; month += 1) {
    value = value * (1 + monthlyRate) + monthlyContribution;
  }

  return { finalValue: value };
}

function statusChip(label, value) {
  return `<span class="status-chip"><small>${label}</small><strong>${value}</strong></span>`;
}

function statusSummary(label, value) {
  return `
    <div class="status-chip">
      <small>${label}</small>
      <strong>${value}</strong>
    </div>
  `;
}

function objectiveLabel(value) {
  const labels = {
    capitalisation: "Capitalisation",
    income: "Revenu",
    property: "Immobilier",
    retirement: "Retraite",
    stability: "Stabilite",
  };
  return labels[value] || value;
}

function updateByPath(path, value) {
  const [root, key] = path.split(".");
  if (!root || !key || !state[root]) {
    return;
  }

  state[root][key] = typeof state[root][key] === "number" ? Number(value) : value;
}

function animateBars() {
  document.querySelectorAll("[data-width]").forEach((node) => {
    node.style.width = node.getAttribute("data-width");
  });
}

function openAccountDialog(account) {
  refs.accountForm.reset();
  populateForm(refs.accountForm, {
    id: account?.id || "",
    label: account?.label || "",
    bucket: account?.bucket || "cash",
    balance: account?.balance || 0,
    rate: account?.rate || 0,
    wrapper: account?.wrapper || "",
  });
  refs.accountDialog.showModal();
}

function openGoalDialog(goal) {
  refs.goalForm.reset();
  populateForm(refs.goalForm, {
    id: goal?.id || "",
    label: goal?.label || "",
    target: goal?.target || 0,
    current: goal?.current || 0,
    monthlyContribution: goal?.monthlyContribution || 0,
    horizonMonths: goal?.horizonMonths || 12,
    priority: goal?.priority || "medium",
  });
  refs.goalDialog.showModal();
}

function bindEvents() {
  const handleLiveUpdate = (event) => {
    const { name, value } = event.target;
    if (
      !name ||
      (!name.startsWith("profile.") && !name.startsWith("strategy.") && !name.startsWith("assistant."))
    ) {
      return;
    }

    updateByPath(name, value);
    saveState();
    render();
  };

  document.addEventListener("input", handleLiveUpdate);
  document.addEventListener("change", handleLiveUpdate);

  refs.addAccountButton.addEventListener("click", () => openAccountDialog());
  refs.addGoalButton.addEventListener("click", () => openGoalDialog());

  refs.accountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(refs.accountForm).entries());
    const account = {
      id: data.id || uid("acc"),
      label: data.label,
      bucket: data.bucket,
      balance: Number(data.balance) || 0,
      rate: Number(data.rate) || 0,
      wrapper: data.wrapper,
    };
    const index = state.accounts.findIndex((item) => item.id === account.id);
    if (index >= 0) {
      state.accounts[index] = account;
    } else {
      state.accounts.push(account);
    }
    refs.accountDialog.close();
    saveState();
    render();
  });

  refs.goalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(refs.goalForm).entries());
    const goal = {
      id: data.id || uid("goal"),
      label: data.label,
      target: Number(data.target) || 0,
      current: Number(data.current) || 0,
      monthlyContribution: Number(data.monthlyContribution) || 0,
      horizonMonths: Number(data.horizonMonths) || 1,
      priority: data.priority,
    };
    const index = state.goals.findIndex((item) => item.id === goal.id);
    if (index >= 0) {
      state.goals[index] = goal;
    } else {
      state.goals.push(goal);
    }
    refs.goalDialog.close();
    saveState();
    render();
  });

  document.addEventListener("click", (event) => {
    const accountEditId = event.target.getAttribute("data-account-edit");
    const accountDeleteId = event.target.getAttribute("data-account-delete");
    const goalEditId = event.target.getAttribute("data-goal-edit");
    const goalDeleteId = event.target.getAttribute("data-goal-delete");

    if (accountEditId) {
      openAccountDialog(state.accounts.find((account) => account.id === accountEditId));
    }
    if (accountDeleteId) {
      state.accounts = state.accounts.filter((account) => account.id !== accountDeleteId);
      saveState();
      render();
    }
    if (goalEditId) {
      openGoalDialog(state.goals.find((goal) => goal.id === goalEditId));
    }
    if (goalDeleteId) {
      state.goals = state.goals.filter((goal) => goal.id !== goalDeleteId);
      saveState();
      render();
    }

    const dialogToClose = event.target.getAttribute("data-close-dialog");
    if (dialogToClose) {
      document.getElementById(dialogToClose)?.close();
    }
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    refs.installButton.hidden = false;
  });

  refs.installButton.addEventListener("click", async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    installPrompt = null;
    refs.installButton.hidden = true;
  });
}

function initReveal() {
  const sections = document.querySelectorAll("[data-reveal]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.12 },
  );
  sections.forEach((section) => observer.observe(section));
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("service-worker.js");
    } catch (error) {
      console.error(error);
    }
  }
}

bindEvents();
initReveal();
render();
registerServiceWorker();
