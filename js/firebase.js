// 1) Create Firebase project (web app) then paste config here
const firebaseConfig = {
  apiKey: "AIzaSyC7jul8cNDMTu6w6wjKtHxFDy45h-q6ub8",
  authDomain: "csr-tracker-2026.firebaseapp.com",
  projectId: "csr-tracker-2026",
  storageBucket: "csr-tracker-2026.firebasestorage.app",
  messagingSenderId: "311719405004",
  appId: "1:311719405004:web:5025163ab9517ef790e969",
  measurementId: "G-N8YVNRW59L"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Collections
const COL = {
  roles: "roles",
  members: "members",
  projects: "projects",
  tasks: "tasks",
  communications: "communications",
  leaves: "leaves",
  audit: "audit_logs",
};

// Helpers
function nowIso() {
  return new Date().toISOString();
}

function toDateOnlyISO(d) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

