const { createHash } = require("node:crypto");

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) throw new Error("Invalid price.");
  return amount.toFixed(2);
}

function paymentHash(hashString, salt, hashType) {
  const algorithm = String(hashType).toUpperCase() === "V2" ? "sha256" : "sha512";
  const payload = hashString.endsWith("|") ? `${hashString}${salt}` : `${hashString}|${salt}`;
  return createHash(algorithm).update(payload).digest("hex");
}

function verificationHash(key, transactionId, salt) {
  return createHash("sha512").update(`${key}|verify_payment|${transactionId}|${salt}`).digest("hex");
}

module.exports = { formatAmount, paymentHash, verificationHash };
