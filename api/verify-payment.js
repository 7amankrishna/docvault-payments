const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { db, requireUser } = require("../lib/firebase");
const { body, error, method, send } = require("../lib/http");
const { formatAmount, verificationHash } = require("../lib/payu");

module.exports = async (req, res) => {
  if (!method(req, res)) return;
  try {
    const user = await requireUser(req);
    const transactionId = String(body(req).transactionId || "");
    if (!/^DV[a-zA-Z0-9]{10,23}$/.test(transactionId)) throw new Error("Invalid transaction ID.");

    const paymentRef = db().doc(`payments/${transactionId}`);
    const payment = (await paymentRef.get()).data();
    if (!payment || payment.userId !== user.uid) throw new Error("Payment not found.");
    if (payment.status === "verified") return send(res, 200, { verified: true });

    const key = process.env.PAYU_KEY;
    const response = await fetch(
      String(process.env.PAYU_ENVIRONMENT || "test").toLowerCase() === "production"
        ? "https://info.payu.in/merchant/postservice.php?form=2"
        : "https://test.payu.in/merchant/postservice.php?form=2",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key, command: "verify_payment", var1: transactionId, hash: verificationHash(key, transactionId, process.env.PAYU_SALT) }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error("PayU verification is temporarily unavailable.");
    const result = await response.json();
    const details = result.transaction_details?.[transactionId];
    let verified = false;
    try {
      verified = details?.status === "success" && formatAmount(details.amt ?? details.amount) === payment.amount;
    } catch {}
    if (!verified) return send(res, 200, { verified: false });

    await db().runTransaction(async (transaction) => {
      const latest = (await transaction.get(paymentRef)).data();
      if (latest?.status === "verified") return;
      const userRef = db().doc(`users/${user.uid}`);
      const existingUser = (await transaction.get(userRef)).data();
      const now = Date.now();
      const premiumUntil = Timestamp.fromMillis(Math.max(now, existingUser?.premiumUntil?.toMillis?.() || 0) + payment.durationDays * 86400000);
      transaction.update(paymentRef, { status: "verified", verifiedAt: FieldValue.serverTimestamp() });
      transaction.set(userRef, { isPremium: true, premiumUntil }, { merge: true });
    });
    return send(res, 200, { verified: true });
  } catch (caught) {
    return error(res, caught, "Payment verification failed.");
  }
};
