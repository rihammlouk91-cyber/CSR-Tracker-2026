// 1) Create Firebase project (web app) then paste config here
const firebaseConfig = {
  apiKey: "PASTE",
  authDomain: "PASTE",
  projectId: "PASTE",
  storageBucket: "PASTE",
  messagingSenderId: "PASTE",
  appId: "PASTE",
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
