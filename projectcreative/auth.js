import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const card = document.getElementById("auth-card");
const authForm = document.getElementById("auth-form");
const formPanel = document.getElementById("form-panel");
const sessionPanel = document.getElementById("session-panel");
const formMessage = document.getElementById("form-message");
const sessionMessage = document.getElementById("session-message");
const sessionHelp = document.getElementById("session-help");
const submitButton = document.getElementById("submit-button");
const submitLabel = submitButton.querySelector(".button-label");
const firebaseHelp = document.getElementById("firebase-help");
const nameField = document.getElementById("name-field");
const confirmField = document.getElementById("confirm-field");
const loginOptions = document.getElementById("login-options");
const consentField = document.getElementById("consent-field");
const switchPrompt = document.getElementById("switch-prompt");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const displayNameInput = document.getElementById("display-name");
const confirmPasswordInput = document.getElementById("confirm-password");
const consentInput = document.getElementById("consent");
const fieldInputs = [displayNameInput, emailInput, passwordInput, confirmPasswordInput];
let mode = "login";
let authOperationInProgress = false;
let renderedUserId = null;

function setFormMessage(message, type, showSetupHelp = false) {
  formMessage.textContent = message;
  formMessage.className = message ? `form-message visible ${type}` : "form-message";
  if (firebaseHelp) firebaseHelp.hidden = !message || !showSetupHelp;
}

function setFieldError(input, message) {
  const field = input.closest(".field");
  const error = document.getElementById(`${input.id}-error`);
  if (!field || !error) return;
  field.classList.toggle("has-error", Boolean(message));
  input.setAttribute("aria-invalid", String(Boolean(message)));
  error.textContent = message;
  error.hidden = !message;
}

function clearFieldErrors() {
  fieldInputs.forEach(input => setFieldError(input, ""));
}

function rejectField(input, message) {
  setFieldError(input, message);
  setFormMessage(message, "error");
  input.focus();
}

function showAuthFieldErrors(error, registering) {
  switch (error?.code) {
    case "auth/invalid-email":
      setFieldError(emailInput, "Địa chỉ email chưa đúng định dạng.");
      break;
    case "auth/email-already-in-use":
      if (registering) setFieldError(emailInput, "Email này đã được dùng. Hãy đăng nhập hoặc nhập email khác.");
      break;
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      if (registering) setFieldError(passwordInput, "Mật khẩu chưa đạt yêu cầu. Hãy dùng ít nhất 8 ký tự.");
      break;
    case "auth/missing-password":
      setFieldError(passwordInput, "Vui lòng nhập mật khẩu.");
      break;
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      if (!registering) {
        setFieldError(emailInput, "Email hoặc mật khẩu chưa chính xác.");
        setFieldError(passwordInput, "Email hoặc mật khẩu chưa chính xác.");
      }
      break;
  }
}

function setSessionMessage(message, type, showFirestoreHelp = false) {
  sessionMessage.textContent = message;
  sessionMessage.classList.toggle("error", type === "error");
  if (sessionHelp) sessionHelp.hidden = !message || !showFirestoreHelp;
}

function setMode(nextMode) {
  mode = nextMode;
  const registering = mode === "register";
  card.dataset.mode = mode;
  document.getElementById("form-title").textContent = registering ? "Bắt đầu hành trình mới" : "Chào mừng trở lại";
  document.getElementById("form-description").textContent = registering
    ? "Tạo tài khoản để lưu hồ sơ học tập an toàn trên Firebase."
    : "Đăng nhập để tiếp tục hành trình học tập của bạn.";
  submitLabel.textContent = registering ? "Tạo tài khoản" : "Đăng nhập";
  const loginTab = document.getElementById("login-tab");
  const registerTab = document.getElementById("register-tab");
  if (loginTab && registerTab) {
    loginTab.classList.toggle("active", !registering);
    registerTab.classList.toggle("active", registering);
    loginTab.setAttribute("aria-current", !registering ? "page" : "false");
  }
  nameField.hidden = !registering;
  confirmField.hidden = !registering;
  if (loginOptions) loginOptions.hidden = registering;
  consentField.hidden = !registering;
  if (switchPrompt) switchPrompt.hidden = registering;
  displayNameInput.required = registering;
  confirmPasswordInput.required = registering;
  consentInput.required = registering;
  passwordInput.autocomplete = registering ? "new-password" : "current-password";
  document.getElementById("password-hint").textContent = registering ? "Tối thiểu 8 ký tự" : "";
  clearFieldErrors();
  setFormMessage("", "");
}

function friendlyError(error) {
  switch (error?.code) {
    case "auth/email-already-in-use": return "Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác.";
    case "auth/invalid-email": return "Địa chỉ email chưa đúng định dạng.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Email hoặc mật khẩu chưa chính xác.";
    case "auth/weak-password": return "Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự.";
    case "auth/password-does-not-meet-requirements": return "Mật khẩu chưa đạt yêu cầu. Hãy dùng ít nhất 8 ký tự.";
    case "auth/missing-password": return "Nhập mật khẩu để tiếp tục.";
    case "auth/too-many-requests": return "Có quá nhiều lần thử. Hãy đợi một chút rồi thử lại.";
    case "auth/network-request-failed": return "Không thể kết nối Firebase. Kiểm tra mạng và thử lại.";
    case "auth/operation-not-allowed": return "Email/Password chưa được bật trong Firebase Authentication.";
    case "auth/configuration-not-found": return "Firebase Authentication chưa được khởi tạo cho dự án. Trong Console, chọn Authentication → Get started rồi bật Email/Password.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid": return "Firebase từ chối API key. Kiểm tra apiKey và projectId trong firebase-config.js.";
    case "auth/unauthorized-domain": return "Tên miền hiện tại chưa được thêm vào Firebase Authentication → Authorized domains.";
    case "permission-denied":
    case "firestore/permission-denied": return "Firestore từ chối lưu hồ sơ. Hãy triển khai firestore.rules trong dự án Firebase.";
    default: return "Đã xảy ra lỗi khi kết nối Firebase. Vui lòng thử lại.";
  }
}

function needsAuthSetupHelp(error) {
  return ["auth/configuration-not-found", "auth/operation-not-allowed", "auth/unauthorized-domain", "auth/invalid-api-key", "auth/api-key-not-valid"].includes(error?.code);
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
  submitButton.classList.toggle("is-loading", isBusy);
  submitButton.setAttribute("aria-busy", String(isBusy));
}

function renderSession(user, notice, type, showFirestoreHelp = false) {
  const signedIn = Boolean(user);
  renderedUserId = user?.uid || null;
  sessionPanel.hidden = !signedIn;
  formPanel.hidden = signedIn;
  const modeSwitch = document.querySelector(".mode-switch");
  if (modeSwitch) modeSwitch.hidden = signedIn;
  if (!signedIn) return;
  const name = user.displayName || user.email?.split("@")[0] || "Học viên";
  document.getElementById("session-name").textContent = `Xin chào, ${name}!`;
  document.getElementById("session-email").textContent = user.email || "";
  setSessionMessage(notice || "Bạn đã đăng nhập thành công.", type, showFirestoreHelp);
}

async function saveUserProfile(user, preferredName = "") {
  const profileRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(profileRef);
  const savedProfile = snapshot.exists() ? snapshot.data() : {};
  const displayName = preferredName || user.displayName || savedProfile.displayName || user.email?.split("@")[0] || "Học viên";
  const profile = {
    displayName,
    email: user.email || "",
    updatedAt: serverTimestamp()
  };
  if (snapshot.exists()) {
    await updateDoc(profileRef, profile);
  } else {
    await setDoc(profileRef, { ...profile, createdAt: serverTimestamp() });
  }
}

document.querySelectorAll("[data-mode]").forEach(button => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

function bindPasswordToggle(buttonId, input, visibleLabel) {
  const button = document.getElementById(buttonId);
  button.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "Ẩn" : "Hiện";
    button.setAttribute("aria-label", show ? `Ẩn ${visibleLabel}` : `Hiện ${visibleLabel}`);
  });
}

bindPasswordToggle("toggle-password", passwordInput, "mật khẩu");
bindPasswordToggle("toggle-confirm-password", confirmPasswordInput, "mật khẩu xác nhận");

const forgotPasswordButton = document.getElementById("forgot-password");
if (forgotPasswordButton) forgotPasswordButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) {
    rejectField(emailInput, "Nhập email trước khi yêu cầu đặt lại mật khẩu.");
    return;
  }
  if (emailInput.validity.typeMismatch) {
    rejectField(emailInput, "Địa chỉ email chưa đúng định dạng.");
    return;
  }
  setFieldError(emailInput, "");
  try {
    await sendPasswordResetEmail(auth, email);
    setFormMessage("Đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra hộp thư email của bạn.", "success");
  } catch (error) {
    console.error("Không gửi được email đặt lại mật khẩu:", error);
    setFormMessage(friendlyError(error), "error", needsAuthSetupHelp(error));
  }
});

authForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const displayName = displayNameInput.value.trim();
  const registering = mode === "register";

  clearFieldErrors();
  setFormMessage("", "");
  if (!email) {
    rejectField(emailInput, "Nhập địa chỉ email của bạn.");
    return;
  }
  if (emailInput.validity.typeMismatch) {
    rejectField(emailInput, "Địa chỉ email chưa đúng định dạng, ví dụ: ban@email.com.");
    return;
  }
  if (!password) {
    rejectField(passwordInput, "Nhập mật khẩu để tiếp tục.");
    return;
  }
  if (registering && displayName.length < 2) {
    rejectField(displayNameInput, "Tên hiển thị cần có ít nhất 2 ký tự.");
    return;
  }
  if (registering && password.length < 8) {
    rejectField(passwordInput, "Mật khẩu cần có ít nhất 8 ký tự.");
    return;
  }
  if (registering && password !== confirmPasswordInput.value) {
    rejectField(confirmPasswordInput, "Hai mật khẩu chưa trùng khớp.");
    return;
  }
  if (registering && !consentInput.checked) {
    setFormMessage("Hãy xác nhận đồng ý tạo và lưu hồ sơ học tập.", "error");
    consentInput.focus();
    return;
  }

  setBusy(true);
  setFormMessage("", "");
  authOperationInProgress = true;
  if (registering) {
    setFormMessage("Đang tạo tài khoản và lưu hồ sơ lên Firebase…", "success");
  } else {
    setFormMessage("Đang kết nối Firebase để đăng nhập…", "success");
  }
  let createdUser = null;
  try {
    if (!registering) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      try {
        await saveUserProfile(credential.user);
      } catch (error) {
        console.error("Đăng nhập được nhưng không đồng bộ được hồ sơ Firestore:", error);
        renderSession(credential.user, `Đăng nhập thành công. Hồ sơ chưa đồng bộ được: ${friendlyError(error)} Bạn vẫn có thể tiếp tục học.`, "error", true);
        return;
      }
      renderSession(credential.user, "Đăng nhập thành công. Hồ sơ học tập đã được đồng bộ.");
      return;
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    createdUser = credential.user;
    let profileWarning = false;
    try {
      await updateProfile(createdUser, { displayName });
    } catch (error) {
      console.error("Không cập nhật được tên hiển thị trong Firebase Authentication:", error);
      profileWarning = true;
    }
    try {
      await saveUserProfile(createdUser, displayName);
    } catch (error) {
      console.error("Không lưu được hồ sơ đăng ký vào Firestore:", error);
      profileWarning = true;
    }
    await signOut(auth);
    window.location.replace(`auth.html?registered=1${profileWarning ? "&profile-warning=1" : ""}`);
  } catch (error) {
    console.error("Không hoàn tất được thao tác tài khoản:", error);
    if (createdUser) {
      renderSession(createdUser, `${friendlyError(error)} Tài khoản Authentication đã được tạo.`, "error");
    } else {
      showAuthFieldErrors(error, registering);
      setFormMessage(friendlyError(error), "error", needsAuthSetupHelp(error));
    }
  } finally {
    authOperationInProgress = false;
    setBusy(false);
  }
});

document.getElementById("signout-button").addEventListener("click", async () => {
  try {
    await signOut(auth);
    setSessionMessage("");
    setFormMessage("Bạn đã đăng xuất an toàn.", "success");
  } catch (error) {
    console.error("Không đăng xuất được khỏi Firebase:", error);
    setSessionMessage(friendlyError(error), "error");
  }
});

onAuthStateChanged(auth, user => {
  if (authOperationInProgress || (user?.uid || null) === renderedUserId) return;
  renderSession(user);
}, error => {
  console.error("Không đọc được trạng thái Firebase Authentication:", error);
  setFormMessage(friendlyError(error), "error", needsAuthSetupHelp(error));
});

setMode(document.body.dataset.authMode || "login");
const registrationComplete = new URLSearchParams(window.location.search).get("registered") === "1";
if (registrationComplete) {
  const profileWarning = new URLSearchParams(window.location.search).get("profile-warning") === "1";
  setFormMessage(
    profileWarning
      ? "Tài khoản đã được tạo. Hãy đăng nhập; nếu hồ sơ chưa đồng bộ, hãy kiểm tra Firestore Rules."
      : "Tạo tài khoản thành công. Hãy đăng nhập bằng email và mật khẩu vừa đăng ký.",
    "success"
  );
  window.history.replaceState(null, "", window.location.pathname);
}
fieldInputs.forEach(input => input.addEventListener("input", () => {
  setFieldError(input, "");
  setFormMessage("", "");
}));
