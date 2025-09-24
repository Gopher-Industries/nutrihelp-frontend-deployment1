// apiClient.js (ES module)
// Single source of truth for API calls

const API_BASE =
  (window.__ENV__ && window.__ENV__.API_BASE) ||
  "https://nutrihelp-backend-deployment.onrender.com/api"; // default

// Helpers to store tokens (adjust if you use cookies instead)
const TOKENS = {
  access: "nh_access",
  refresh: "nh_refresh",
};
export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(TOKENS.access, accessToken);
  if (refreshToken) localStorage.setItem(TOKENS.refresh, refreshToken);
}
export function clearTokens() {
  localStorage.removeItem(TOKENS.access);
  localStorage.removeItem(TOKENS.refresh);
}
function getAccess() { return localStorage.getItem(TOKENS.access); }
function getRefresh() { return localStorage.getItem(TOKENS.refresh); }

async function baseFetch(path, { method = "GET", json, headers = {}, auth = true, formData } = {}) {
  const url = `${API_BASE}${path}`;
  const h = { ...headers };
  if (!formData && json) h["Content-Type"] = "application/json";
  if (auth && getAccess()) h["Authorization"] = `Bearer ${getAccess()}`;

  const res = await fetch(url, {
    method,
    headers: h,
    credentials: "include", // safe even if server ignores
    body: formData ? formData : json ? JSON.stringify(json) : undefined,
  });

  // Try to parse JSON; some GETs may have no body
  let data = null;
  try { data = await res.json(); } catch {}

  if (res.status === 401 && auth && getRefresh()) {
    // try refresh once
    const ok = await tryRefresh();
    if (ok) return baseFetch(path, { method, json, headers, auth, formData });
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function tryRefresh() {
  const refreshToken = getRefresh();
  if (!refreshToken) return false;
  try {
    const data = await baseFetch("/auth/refresh", {
      method: "POST",
      json: { refreshToken },
      auth: false,
    });
    setTokens({
      accessToken: data.accessToken || data.token,
      refreshToken: data.refreshToken || refreshToken,
    });
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// -------- AUTH --------
async function tryBoth(primaryPath, secondaryPath, options) {
  try {
    return await baseFetch(primaryPath, options);
  } catch (e) {
    // If first route is missing (404) or method not allowed (405), try the other
    if (/(404|405)/.test(e.message)) {
      return baseFetch(secondaryPath, options);
    }
    throw e;
  }
}

export const auth = {
  register(payload) {
    // Try /auth/register, then /signup
    return tryBoth(
      "/auth/register",
      "/signup",
      { method: "POST", json: payload, auth: false }
    );
  },
  login(payload) {
    // Try /auth/login, then /login
    return tryBoth(
      "/auth/login",
      "/login",
      { method: "POST", json: payload, auth: false }
    );
  },
  mfa(payload) {
    // Try /login/mfa (as listed), fallback none
    return baseFetch("/login/mfa", { method: "POST", json: payload, auth: false });
  },
  logout() {
    return baseFetch("/auth/logout", { method: "POST" });
  },
  profile() {
    return baseFetch("/auth/profile", { method: "GET" });
  },
  health() {
    return baseFetch("/auth/health", { method: "GET", auth: false });
  },
};


// -------- RECIPES --------
export const recipes = {
  filter(params = {}) { // GET /filter?...
    const qs = new URLSearchParams(params).toString();
    return baseFetch(`/filter${qs ? `?${qs}` : ""}`, { method: "GET", auth: false });
  },
  all(body = {}) { // POST /recipe (your API lists POST /recipe = get all)
    return baseFetch("/recipe", { method: "POST", json: body, auth: false });
  },
  cost(recipeId) {
    return baseFetch(`/recipe/cost/${encodeURIComponent(recipeId)}`, { method: "GET" });
  },
  nutritionLogByName(name) {
    const qs = new URLSearchParams({ name }).toString();
    return baseFetch(`/recipe/nutritionlog?${qs}`, { method: "GET" });
  },
};

// -------- FOOD DATA LOOKUPS --------
export const fooddata = {
  dietaryRequirements() { return baseFetch("/fooddata/dietaryrequirements", { method: "GET", auth: false }); },
  cuisines() { return baseFetch("/fooddata/cuisines", { method: "GET", auth: false }); },
  allergies() { return baseFetch("/fooddata/allergies", { method: "GET", auth: false }); },
  ingredients() { return baseFetch("/fooddata/ingredients", { method: "GET", auth: false }); },
  cookingMethods() { return baseFetch("/fooddata/cookingmethods", { method: "GET", auth: false }); },
  spiceLevels() { return baseFetch("/fooddata/spicelevels", { method: "GET", auth: false }); },
  healthConditions() { return baseFetch("/fooddata/healthconditions", { method: "GET", auth: false }); },
};

// -------- MEAL PLAN --------
export const mealplan = {
  get(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return baseFetch(`/mealplan${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  save(body) {
    return baseFetch("/mealplan", { method: "POST", json: body });
  },
  remove(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return baseFetch(`/mealplan${qs ? `?${qs}` : ""}`, { method: "DELETE" });
  },
};

// -------- USER PREFS / PROFILE / FEEDBACK --------
export const user = {
  getPreferences() { return baseFetch("/user/preferences", { method: "GET" }); },
  updatePreferences(body) { return baseFetch("/user/preferences", { method: "POST", json: body }); },
  getProfile() { return baseFetch("/userprofile", { method: "GET" }); },
  updateProfile(body) { return baseFetch("/userprofile", { method: "PUT", json: body }); },
  feedback(body) { return baseFetch("/userfeedback", { method: "POST", json: body, auth: false }); },
};

// -------- CONTACT / APPOINTMENTS --------
export const comms = {
  contactUs(body) { return baseFetch("/contactus", { method: "POST", json: body, auth: false }); },
  saveAppointment(body) { return baseFetch("/appointments", { method: "POST", json: body }); },
  getAppointments() { return baseFetch("/appointments", { method: "GET" }); },
};

// -------- NOTIFICATIONS --------
export const notify = {
  create(body) { return baseFetch("/notifications", { method: "POST", json: body }); },
  allForUser(userId) { return baseFetch(`/notifications/${encodeURIComponent(userId)}`, { method: "GET" }); },
  update(simpleId, body) { return baseFetch(`/notifications/${encodeURIComponent(simpleId)}`, { method: "PUT", json: body }); },
  remove(simpleId) { return baseFetch(`/notifications/${encodeURIComponent(simpleId)}`, { method: "DELETE" }); },
};

// -------- HEALTH NEWS / ARTICLES --------
export const news = {
  list() { return baseFetch("/health-news", { method: "GET" }); },
  create(body) { return baseFetch("/health-news", { method: "POST", json: body }); },
  update(body) { return baseFetch("/health-news", { method: "PUT", json: body }); },
  remove(body) { return baseFetch("/health-news", { method: "DELETE", json: body }); },
  searchArticles(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return baseFetch(`/healthArticles${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
};

// -------- WATER INTAKE --------
export const water = {
  update(body) { return baseFetch("/water-intake", { method: "POST", json: body }); },
};

// -------- CHATBOT HISTORY --------
export const chatbot = {
  history(body) { return baseFetch("/chatbot/history", { method: "POST", json: body }); },
  clear() { return baseFetch("/chatbot/history", { method: "DELETE" }); },
};

// -------- MEDICAL REPORT --------
export const medical = {
  retrieve(body) { return baseFetch("/medical-report/retrieve", { method: "POST", json: body }); },
};

// -------- IMAGE UPLOADS & CLASSIFICATION --------
export const media = {
  upload(file, extra = {}) {
    const fd = new FormData();
    fd.append("file", file);
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    return baseFetch("/upload", { method: "POST", formData: fd });
  },
  imageClassification(body) { return baseFetch("/imageClassification", { method: "POST", json: body }); },
  recipeImageClassification(body) { return baseFetch("/recipeImageClassification", { method: "POST", json: body }); },
  ingredientSubstitution(ingredientId) {
    return baseFetch(`/substitution/ingredient/${encodeURIComponent(ingredientId)}`, { method: "GET" });
  },
};

// -------- SYSTEM / SECURITY --------
export const system = {
  generateBaseline() { return baseFetch("/system/generate-baseline", { method: "POST" }); },
  integrityCheck() { return baseFetch("/system/integrity-check", { method: "GET" }); },
  logLoginAttempt(body) { return baseFetch("/auth/log-login-attempt", { method: "POST", json: body, auth: false }); },
};

// Convenient namespace export
const api = { auth, recipes, fooddata, mealplan, user, comms, notify, news, water, chatbot, medical, media, system, setTokens, clearTokens };
export default api;
