import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const profileLink = document.getElementById("account-link");
const avatar = document.getElementById("account-avatar");
const accountName = document.getElementById("account-name");
const accountSub = document.getElementById("account-sub");
const shortcut = document.getElementById("account-shortcut");

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "HV";
}

onAuthStateChanged(auth, user => {
  if (!profileLink || !avatar || !accountName || !accountSub) return;
  if (!user) {
    avatar.textContent = "HV";
    accountName.textContent = "Học viên";
    accountSub.textContent = "Đăng nhập hoặc đăng ký";
    profileLink.setAttribute("aria-label", "Đăng nhập hoặc tạo tài khoản");
    if (shortcut) shortcut.setAttribute("aria-label", "Đăng nhập hoặc tạo tài khoản");
    return;
  }
  const name = user.displayName || user.email?.split("@")[0] || "Học viên";
  avatar.textContent = initials(name);
  accountName.textContent = name;
  accountSub.textContent = user.email || "Tài khoản Lingua Quest";
  profileLink.setAttribute("aria-label", `Tài khoản ${name}. Mở cài đặt tài khoản`);
  if (shortcut) shortcut.setAttribute("aria-label", `Tài khoản ${name}`);
}, error => {
  console.error("Không tải được trạng thái tài khoản:", error);
});
