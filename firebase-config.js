import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbsEtD0cp2XG0Q62CX_UYY7GcD2z_0Jec",
  authDomain: "english-f3d71.firebaseapp.com",
  projectId: "english-f3d71",
  storageBucket: "english-f3d71.firebasestorage.app",
  messagingSenderId: "994120036134",
  appId: "1:994120036134:web:bebedbb7283e0a8def5be7",
  measurementId: "G-6LZJQTL52B"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = isSupported()
  .then(supported => supported ? getAnalytics(app) : null)
  .catch(error => {
    console.error("Firebase Analytics không thể khởi tạo:", error);
    return null;
  });
