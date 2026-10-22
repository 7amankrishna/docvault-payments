const assert = require("node:assert/strict");
const test = require("node:test");
const { formatAmount, paymentHash, verificationHash } = require("../lib/payu");

test("formats a configured Firestore price", () => {
  assert.equal(formatAmount(99), "99.00");
  assert.throws(() => formatAmount(0));
});

test("generates deterministic PayU hashes", () => {
  assert.equal(paymentHash("key|value|", "salt"), paymentHash("key|value", "salt"));
  assert.equal(paymentHash("payload", "salt", "V2").length, 64);
  assert.equal(verificationHash("key", "DV123", "salt").length, 128);
});
