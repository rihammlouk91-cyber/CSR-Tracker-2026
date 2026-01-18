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

window.auth = firebase.auth();
window.db = firebase.firestore();

window.COL = {
  projects: "projects",
  tasks: "tasks",
  communications: "communications",
  leaves: "leaves",
  members: "members",
  roles: "roles",
  audit: "audit",
};
