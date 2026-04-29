// ===================================================
//  DETONATION - shared.js (Supabase対応版)
// ===================================================

const SUPABASE_URL = "https://xkmcjibuelikqptqnsga.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrbWNqaWJ1ZWxpa3FwdHFuc2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQxOTUsImV4cCI6MjA5MjUxMDE5NX0.a5pH0jxxedmzfNr4HdDpUh99Zh5Ar2cdArqU1kQcx94";
// bomb.htmlから参照できるようにグローバルに公開
window._SUPABASE_URL = SUPABASE_URL;
window._SUPABASE_KEY = SUPABASE_ANON_KEY;

// Supabase APIヘルパー
async function supabaseGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase GET error: ${res.status}`);
  return res.json();
}

// ===================================================
//  ユーザーセッション管理（localStorageのまま）
//  ※ログイン情報はサーバーに送らない設計
// ===================================================
const SESSION_KEY = "detonation_user_session";

function setUserSession(userData) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      ...userData,
      loginTime: new Date().toISOString(),
    }),
  );
}

function getUserSession() {
  try {
    const item = localStorage.getItem(SESSION_KEY);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function isUserLoggedIn() {
  const s = getUserSession();
  return s && s.username;
}

function clearUserSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ===================================================
//  認証
// ===================================================
function authenticateUser(username, password) {
  const validCredentials = {
    bh00121: "b9QVqvdB",
  };
  return validCredentials[username] === password;
}

// ===================================================
//  爆弾データ管理（Supabaseから取得）
// ===================================================

// 全爆弾 or 1件取得
// 戻り値: bombId指定なし→オブジェクト {id: bomb, ...}、指定あり→bombオブジェクト or null
async function getBombData(bombId = null) {
  try {
    const params = bombId ? `?id=eq.${bombId}` : "";
    const rows = await supabaseGet("bombs", params);

    if (bombId) {
      // カラム名をフロントエンドのキー名に変換
      return rows.length > 0 ? rowToBomb(rows[0]) : null;
    } else {
      const result = {};
      rows.forEach((row) => {
        result[row.id] = rowToBomb(row);
      });
      return result;
    }
  } catch (err) {
    console.error("getBombData失敗:", err);
    return bombId ? null : {};
  }
}

// DBのカラム名 → フロントエンドのキー名に変換
function rowToBomb(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    status: row.status,
    endTime: row.end_time,
    defuseCode: row.defuse_code,
    hintImage: row.hint_image || "",
    cipherImage: row.cipher_image || "",
    owner: row.owner,
    decryptionKey: row.decryption_key,
    type: row.type,
  };
}

// game_stateから1件取得
async function getGameState(key) {
  try {
    const rows = await supabaseGet("game_state", `?key=eq.${key}`);
    return rows.length > 0 ? rows[0].value : null;
  } catch (err) {
    console.error("getGameState失敗:", err);
    return null;
  }
}

// 解除モードが有効かどうか
async function isDefuseModeEnabled(bombId) {
  const val = await getGameState(`defuse_mode_${bombId}`);
  return val === "true";
}

// ===================================================
//  カウントダウン機能
// ===================================================
function formatTime(milliseconds) {
  if (milliseconds <= 0) return "00:00:00";
  const total = Math.floor(milliseconds / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function startCountdown(elementId, endTime, onComplete = null) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const targetTime = new Date(endTime).getTime();

  function tick() {
    const remaining = targetTime - Date.now();
    if (remaining <= 0) {
      element.textContent = "00:00:00";
      element.style.color = "var(--danger-red)";
      element.classList.add("pulse");
      if (onComplete) onComplete();
      return;
    }
    element.textContent = formatTime(remaining);
    if (remaining < 60 * 60 * 1000) {
      element.style.color = "var(--danger-red)";
      element.classList.add("pulse");
    }
  }
  tick();
  return setInterval(tick, 1000);
}

function startMultipleCountdowns(countdowns) {
  return countdowns
    .map((c) => startCountdown(c.elementId, c.endTime, c.onComplete))
    .filter(Boolean);
}

// ===================================================
//  ページ遷移ヘルパー
// ===================================================
function redirectToLogin() {
  window.location.href = "login.html";
}
function redirectToDashboard() {
  window.location.href = "dashboard.html";
}
function redirectToRegister() {
  window.location.href = "register.html";
}
function redirectToHome() {
  window.location.href = "index.html";
}
function redirectToBombStatus(bombId) {
  window.location.href = `bomb.html?id=${bombId}`;
}

function getURLParameter(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ===================================================
//  アクセス制御
// ===================================================
function requireAuth() {
  if (!isUserLoggedIn()) {
    alert("ログインが必要です。");
    redirectToLogin();
    return false;
  }
  return true;
}

// ===================================================
//  UI ユーティリティ
// ===================================================
function showNotification(message, type = "info") {
  const n = document.createElement("div");
  n.textContent = message;
  n.style.cssText = `
        position:fixed; top:20px; right:20px;
        padding:15px 20px;
        background:${type === "error" ? "var(--danger-red)" : "var(--primary-color)"};
        color:white; border-radius:8px; z-index:10000;
        box-shadow:0 4px 20px rgba(0,0,0,0.3);
        animation:slideDown 0.3s ease-out;
    `;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

function addSlideDownAnimation() {
  if (document.querySelector("#slideDownKeyframes")) return;
  const style = document.createElement("style");
  style.id = "slideDownKeyframes";
  style.textContent = `
        @keyframes slideDown {
            from { transform:translateY(-100px); opacity:0; }
            to   { transform:translateY(0);      opacity:1; }
        }
    `;
  document.head.appendChild(style);
}

function validateForm(formElement) {
  let isValid = true;
  formElement
    .querySelectorAll("input[required],select[required],textarea[required]")
    .forEach((input) => {
      if (!input.value.trim()) {
        input.style.borderColor = "var(--danger-red)";
        isValid = false;
      } else {
        input.style.borderColor = "var(--border-color)";
      }
    });
  return isValid;
}

// ===================================================
//  ページ初期化
// ===================================================
function initializePage() {
  addSlideDownAnimation();
  document.body.classList.add("slide-up");
  console.log("Page initialized - DETONATION System Ready (Supabase)");
}

document.addEventListener("DOMContentLoaded", initializePage);

// ===================================================
//  デバッグ
// ===================================================
async function debugInfo() {
  console.log("=== DETONATION DEBUG INFO ===");
  console.log("User Session:", getUserSession());
  console.log("Bomb Data:", await getBombData());
  console.log("=============================");
}

// ===================================================
//  グローバル公開
// ===================================================
window.detonationSystem = {
  authenticateUser,
  setUserSession,
  getUserSession,
  isUserLoggedIn,
  clearUserSession,
  getBombData,
  getGameState,
  isDefuseModeEnabled,
  startCountdown,
  startMultipleCountdowns,
  formatTime,
  redirectToLogin,
  redirectToDashboard,
  redirectToRegister,
  redirectToHome,
  redirectToBombStatus,
  getURLParameter,
  requireAuth,
  showNotification,
  validateForm,
  debugInfo,
  supabaseGet,
};

// 隠しコマンド: F2×5で全画面動画
(function () {
  const VIDEO_URL = "https://bomb-helper.vercel.app/part2.mp4"; // 変更してください
  let count = 0;
  let timer;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "F2") {
      count = 0;
      return;
    }
    e.preventDefault();
    count++;
    clearTimeout(timer);
    timer = setTimeout(() => (count = 0), 2000); // 2秒以内に5回
    if (count < 5) return;
    count = 0;

    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;";
    const video = document.createElement("video");
    video.src = VIDEO_URL;
    video.autoplay = true;
    video.controls = true;
    video.style.cssText = "max-width:100%;max-height:100%;";
    video.addEventListener("ended", () => overlay.remove());
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });
    overlay.appendChild(video);
    document.body.appendChild(overlay);
  });
})();
