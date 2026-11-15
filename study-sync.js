import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

let currentUser = null;
let resolveAuth;
let authResolved = false;
const authListeners = new Set();
const authReady = new Promise(resolve => { resolveAuth = resolve; });
let activeSeconds = 0;
let activeUserId = null;
let lastActivityAt = 0;
let lastTimerTick = Date.now();

function localDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function trackActiveMinute() {
  const notifyMinute = () => window.dispatchEvent(new Event("lingua-study-minute"));
  if (!currentUser) {
    notifyMinute();
    return;
  }
  request("/api/v1/events", {
    method: "POST",
    body: JSON.stringify({ event_type: "study", minutes: 1, local_date: localDateKey() })
  }).then(notifyMinute).catch(showSyncError);
}

["pointerdown", "keydown", "input", "scroll", "touchstart", "wheel"].forEach(type => {
  document.addEventListener(type, () => { lastActivityAt = Date.now(); }, { passive: true });
});

setInterval(() => {
  const now = Date.now();
  const elapsed = Math.min((now - lastTimerTick) / 1000, 20);
  lastTimerTick = now;
  if (document.visibilityState !== "visible" || now - lastActivityAt > 120000) return;
  activeSeconds += elapsed;
  if (activeSeconds >= 60) {
    activeSeconds -= 60;
    trackActiveMinute();
  }
}, 10000);

onAuthStateChanged(auth, user => {
  const nextUserId = user?.uid || null;
  if (nextUserId !== activeUserId) activeSeconds = 0;
  activeUserId = nextUserId;
  currentUser = user;
  authResolved = true;
  resolveAuth(user);
  authListeners.forEach(listener => listener(user));
}, error => {
  authResolved = true;
  console.error("Không xác định được tài khoản học tập:", error);
  resolveAuth(null);
});

async function request(path, options = {}) {
  await authReady;
  if (!currentUser) return null;
  const token = await currentUser.getIdToken();
  const apiBaseUrl = window.LINGUA_API_BASE_URL?.trim();
  if (!apiBaseUrl && window.location.hostname.endsWith(".github.io")) {
    throw new Error("API thống kê chưa được cấu hình cho GitHub Pages. Hãy đặt repository variable LINGUA_API_BASE_URL.");
  }
  const url = apiBaseUrl
    ? new URL(path, `${apiBaseUrl.replace(/\/+$/, "")}/`).toString()
    : path;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Yêu cầu đồng bộ thất bại (${response.status}).`);
  }
  return response.json();
}

function showSyncError(error) {
  console.error("Không đồng bộ được tiến độ học:", error);
  const status = document.getElementById("study-sync-status");
  if (status) status.textContent = `Không thể đồng bộ dữ liệu: ${error.message}`;
}

async function record(payload) {
  if (!currentUser) await authReady;
  if (!currentUser) return false;
  try {
    await request("/api/v1/events", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        local_date: localDateKey()
      })
    });
    return true;
  } catch (error) {
    showSyncError(error);
    throw error;
  }
}

async function loadDashboard(legacyWords) {
  if (!currentUser) return null;
  await request("/api/v1/migrate", {
    method: "POST",
    body: JSON.stringify({ words: legacyWords.slice(0, 400) })
  });
  const date = new Date();
  const localDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  return request(`/api/v1/dashboard?local_date=${localDate}`);
}

window.linguaLearning = {
  record,
  loadDashboard,
  subscribe(listener) {
    authListeners.add(listener);
    if (authResolved) listener(currentUser);
    return () => authListeners.delete(listener);
  }
};
window.dispatchEvent(new Event("lingua-sync-ready"));
