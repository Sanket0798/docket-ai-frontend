/**
 * MOCK API — used for client demo / Vercel deployment
 * Toggle via VITE_USE_MOCK=true in .env.production
 *
 * To switch back to real backend: set VITE_USE_MOCK=false (or remove it)
 * All mock data is stored in localStorage so state persists across refreshes.
 */

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms));

// ─── Seed Data ────────────────────────────────────────────────────────────────

const DEMO_USER = {
  id: 1,
  first_name: 'Demo',
  last_name: 'User',
  email: 'demo@docketfactory.com',
  phone: '+91 98765 43210',
  company_name: 'Docket Factory',
  credits: 250.00,
  avatar_url: null,
  is_email_verified: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

const DEMO_TOKEN = 'mock_token_demo_user';

const SEED_WORKSPACES = [
  { id: 1, name: 'Brand Campaign 2026', description: 'All brand video assets', project_count: 3, created_at: '2026-03-01T00:00:00.000Z' },
  { id: 2, name: 'Product Launch',      description: 'Launch video series',    project_count: 1, created_at: '2026-03-15T00:00:00.000Z' },
];

const SEED_PROJECTS = {
  1: [
    { id: 101, workspace_id: 1, name: 'Hero TVC',        status: 'completed', script_text: 'A powerful brand story...', script_pdf_url: null, audio_url: null, created_at: '2026-03-02T00:00:00.000Z' },
    { id: 102, workspace_id: 1, name: 'Social Cut 30s',  status: 'draft',     script_text: '',                          script_pdf_url: null, audio_url: null, created_at: '2026-03-10T00:00:00.000Z' },
    { id: 103, workspace_id: 1, name: 'YouTube Pre-roll', status: 'processing', script_text: 'Opening hook...',          script_pdf_url: null, audio_url: null, created_at: '2026-03-18T00:00:00.000Z' },
  ],
  2: [
    { id: 201, workspace_id: 2, name: 'Launch Teaser',   status: 'draft',     script_text: '',                          script_pdf_url: null, audio_url: null, created_at: '2026-03-16T00:00:00.000Z' },
  ],
};

const SEED_QUESTIONS = {
  101: [
    { id: 1, project_id: 101, question: 'What lighting tone fits this scene?',       answer: 'golden_hour',  question_order: 0 },
    { id: 2, project_id: 101, question: 'What mood should the video convey?',        answer: 'inspirational', question_order: 1 },
    { id: 3, project_id: 101, question: 'What should the video pacing feel like?',   answer: 'dynamic',      question_order: 2 },
    { id: 4, project_id: 101, question: 'What color grading style do you prefer?',   answer: 'warm_tones',   question_order: 3 },
  ],
};

const SEED_PLANS = [
  { id: 1, name: 'Starter',  credits: 100,  price: 99,  description: 'Perfect for trying out Docket Factory', is_active: true },
  { id: 2, name: 'Pro',      credits: 500,  price: 399, description: 'For regular creators',                  is_active: true },
  { id: 3, name: 'Business', credits: 1500, price: 999, description: 'For teams and heavy usage',             is_active: true },
];

const SEED_PAYMENTS = [
  { id: 1, plan_name: 'Pro',     amount: 399, credits_purchased: 500,  payment_method: 'UPI',  status: 'completed', created_at: '2026-02-10T00:00:00.000Z' },
  { id: 2, plan_name: 'Starter', amount: 99,  credits_purchased: 100,  payment_method: 'Card', status: 'completed', created_at: '2026-01-05T00:00:00.000Z' },
];

const SEED_USAGE = [
  { id: 1, action: 'Script Generation',  credits_used: 50, type: 'debit',  status: 'completed', created_at: '2026-03-20T00:00:00.000Z' },
  { id: 2, action: 'AI Questions',       credits_used: 20, type: 'debit',  status: 'completed', created_at: '2026-03-18T00:00:00.000Z' },
  { id: 3, action: 'Credits Purchased',  credits_used: 500, type: 'credit', status: 'completed', created_at: '2026-02-10T00:00:00.000Z' },
];

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const ls = {
  get: (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(`mock_${key}`)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, val) => localStorage.setItem(`mock_${key}`, JSON.stringify(val)),
};

const getWorkspaces  = ()    => ls.get('workspaces', SEED_WORKSPACES);
const setWorkspaces  = (val) => ls.set('workspaces', val);
const getProjects    = ()    => ls.get('projects', SEED_PROJECTS);
const setProjects    = (val) => ls.set('projects', val);
const getQuestions   = ()    => ls.get('questions', SEED_QUESTIONS);
const setQuestions   = (val) => ls.set('questions', val);
const getOnboarding  = ()    => ls.get('onboarding', null);
const setOnboarding  = (val) => ls.set('onboarding', val);

// ─── Mock response wrapper ────────────────────────────────────────────────────

const ok   = (data)    => ({ data });
const fail = (msg, status = 400) => { const e = new Error(msg); e.response = { data: { message: msg }, status }; throw e; };

// ─── Route handlers ───────────────────────────────────────────────────────────

const handlers = {

  // AUTH
  'POST /auth/register': async ({ first_name, last_name, email }) => {
    await delay();
    return ok({ message: 'Registered successfully.', userId: 1 });
  },

  'POST /auth/login': async ({ email, password }) => {
    await delay();
    // Accept any credentials for demo
    return ok({ token: DEMO_TOKEN, user: DEMO_USER, onboardingDone: !!getOnboarding()?.completed });
  },

  'POST /auth/verify-email': async () => {
    await delay();
    return ok({ token: DEMO_TOKEN, user: DEMO_USER, onboardingDone: false });
  },

  'POST /auth/resend-otp': async () => {
    await delay(300);
    return ok({ message: 'OTP resent successfully' });
  },

  'POST /auth/forgot-password': async ({ email }) => {
    await delay();
    return ok({ message: 'If that email exists, an OTP has been sent.', userId: 1 });
  },

  'POST /auth/reset-password': async () => {
    await delay();
    return ok({ message: 'Password reset successfully' });
  },

  'GET /auth/me': async () => {
    await delay(200);
    return ok(DEMO_USER);
  },

  // ONBOARDING
  'GET /onboarding': async () => {
    await delay(200);
    return ok(getOnboarding());
  },

  'POST /onboarding': async (body) => {
    await delay();
    setOnboarding({ ...body, completed: body.completed ?? false });
    return ok({ message: 'Onboarding saved' });
  },

  // PROFILE
  'GET /profile': async () => {
    await delay(200);
    return ok(DEMO_USER);
  },

  'PUT /profile': async (body) => {
    await delay();
    return ok({ message: 'Profile updated' });
  },

  // WORKSPACES
  'GET /workspaces': async () => {
    await delay();
    return ok(getWorkspaces());
  },

  'POST /workspaces': async ({ name, description }) => {
    await delay();
    const ws = getWorkspaces();
    const newWs = { id: Date.now(), name, description: description || '', project_count: 0, created_at: new Date().toISOString() };
    setWorkspaces([...ws, newWs]);
    return ok(newWs);
  },

  'DELETE /workspaces/:id': async (_, { id }) => {
    await delay();
    setWorkspaces(getWorkspaces().filter(w => w.id !== Number(id)));
    return ok({ message: 'Deleted' });
  },

  // PROJECTS
  'GET /projects/workspace/:workspaceId': async (_, { workspaceId }) => {
    await delay();
    const all = getProjects();
    return ok(all[workspaceId] || []);
  },

  'POST /projects/workspace/:workspaceId': async ({ name }, { workspaceId }) => {
    await delay();
    const all = getProjects();
    const list = all[workspaceId] || [];
    const newP = { id: Date.now(), workspace_id: Number(workspaceId), name, status: 'draft', script_text: '', script_pdf_url: null, audio_url: null, created_at: new Date().toISOString() };
    all[workspaceId] = [...list, newP];
    setProjects(all);
    // Update workspace project count
    setWorkspaces(getWorkspaces().map(w => w.id === Number(workspaceId) ? { ...w, project_count: (w.project_count || 0) + 1 } : w));
    return ok(newP);
  },

  'GET /projects/:projectId': async (_, { projectId }) => {
    await delay(200);
    const all = getProjects();
    for (const list of Object.values(all)) {
      const p = list.find(p => p.id === Number(projectId));
      if (p) return ok(p);
    }
    return ok({ id: Number(projectId), name: 'Demo Project', status: 'draft', script_text: 'This is a demo script for the client preview.', script_pdf_url: null });
  },

  'PUT /projects/:projectId/script': async ({ script_text }, { projectId }) => {
    await delay();
    const all = getProjects();
    for (const key of Object.keys(all)) {
      all[key] = all[key].map(p => p.id === Number(projectId) ? { ...p, script_text } : p);
    }
    setProjects(all);
    return ok({ message: 'Script saved' });
  },

  'PUT /projects/:projectId/status': async ({ status }, { projectId }) => {
    await delay();
    const all = getProjects();
    for (const key of Object.keys(all)) {
      all[key] = all[key].map(p => p.id === Number(projectId) ? { ...p, status } : p);
    }
    setProjects(all);
    return ok({ message: 'Status updated' });
  },

  'DELETE /projects/:id': async (_, { id }) => {
    await delay();
    const all = getProjects();
    for (const key of Object.keys(all)) {
      all[key] = all[key].filter(p => p.id !== Number(id));
    }
    setProjects(all);
    return ok({ message: 'Deleted' });
  },

  'POST /projects/:projectId/upload-pdf': async (_, { projectId }) => {
    await delay(800);
    return ok({ url: '/assets/demo-script.pdf', message: 'Uploaded' });
  },

  'POST /projects/:projectId/upload-audio': async (_, { projectId }) => {
    await delay(800);
    return ok({ url: '/assets/demo-audio.mp3', message: 'Uploaded' });
  },

  // QUESTIONS
  'GET /projects/:projectId/questions': async (_, { projectId }) => {
    await delay(200);
    const all = getQuestions();
    return ok(all[projectId] || []);
  },

  'POST /projects/:projectId/questions': async (body, { projectId }) => {
    await delay(300);
    const all = getQuestions();
    const list = all[projectId] || [];
    const newQ = { id: Date.now(), project_id: Number(projectId), ...body };
    all[projectId] = [...list, newQ];
    setQuestions(all);
    return ok(newQ);
  },

  // CREDITS
  'GET /credits/plans': async () => {
    await delay();
    return ok(SEED_PLANS);
  },

  'GET /credits/payments': async () => {
    await delay();
    return ok(SEED_PAYMENTS);
  },

  'GET /credits/usage': async () => {
    await delay();
    return ok(SEED_USAGE.filter(u => u.type === 'debit'));
  },

  'GET /credits/history': async () => {
    await delay();
    return ok(SEED_USAGE);
  },

  'POST /credits/order': async ({ plan_id }) => {
    await delay();
    const plan = SEED_PLANS.find(p => p.id === plan_id) || SEED_PLANS[0];
    return ok({ order_id: `mock_order_${Date.now()}`, amount: plan.price * 100, currency: 'INR', is_mock: true });
  },

  'POST /credits/verify': async () => {
    await delay();
    return ok({ message: 'Payment verified', credits: DEMO_USER.credits });
  },
};

// ─── URL matcher ──────────────────────────────────────────────────────────────

const matchRoute = (method, url) => {
  const path = url.replace(/^\/api/, '');
  const key = `${method} ${path}`;

  // Exact match first
  if (handlers[key]) return { handler: handlers[key], params: {} };

  // Pattern match
  for (const pattern of Object.keys(handlers)) {
    const [pMethod, pPath] = pattern.split(' ');
    if (pMethod !== method) continue;

    const paramNames = [];
    const regexStr = pPath.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const match = path.match(new RegExp(`^${regexStr}$`));
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
      return { handler: handlers[pattern], params };
    }
  }
  return null;
};

// ─── Mock API object (same interface as axios instance) ───────────────────────

const mockApi = {
  get:    (url, config)        => mockApi._call('GET',    url, {}, config),
  post:   (url, data, config)  => mockApi._call('POST',   url, data, config),
  put:    (url, data, config)  => mockApi._call('PUT',    url, data, config),
  delete: (url, config)        => mockApi._call('DELETE', url, {}, config),

  _call: async (method, url, data = {}, config = {}) => {
    const match = matchRoute(method, url);
    if (!match) {
      console.warn(`[MockAPI] No handler for ${method} ${url}`);
      return ok({});
    }
    return match.handler(data, match.params, config);
  },
};

export default mockApi;
