const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

function app() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "");
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getApps()[0];
}

async function requireUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Sign in before paying.");
  return getAuth(app()).verifyIdToken(token);
}

function db() {
  return getFirestore(app());
}

module.exports = { db, requireUser };
