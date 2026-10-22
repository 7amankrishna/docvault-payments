const { db, requireUser } = require("../lib/firebase");
const { body, error, method, send } = require("../lib/http");
const { paymentHash } = require("../lib/payu");

module.exports = async (req, res) => {
  if (!method(req, res)) return;
  try {
    const user = await requireUser(req);
    const input = body(req);
    const transactionId = String(input.transactionId || "");
    const { hashName, hashString, hashType } = input;
    if (!/^DV[a-zA-Z0-9]{10,23}$/.test(transactionId) || typeof hashName !== "string" || !hashName) throw new Error("Invalid PayU hash request.");
    if (typeof hashString !== "string" || hashString.length < 3 || hashString.length > 10000) throw new Error("Invalid PayU hash request.");

    const payment = (await db().doc(`payments/${transactionId}`).get()).data();
    const age = Date.now() - (payment?.createdAt?.toMillis?.() || 0);
    if (!payment || payment.userId !== user.uid || payment.status !== "pending" || age > 30 * 60 * 1000) throw new Error("Payment session expired.");
    if (hashString.includes(transactionId) && (!hashString.startsWith(`${process.env.PAYU_KEY}|${transactionId}|`) || !hashString.includes(`|${payment.amount}|`))) {
      throw new Error("Payment details do not match the order.");
    }
    return send(res, 200, { hash: paymentHash(hashString, process.env.PAYU_SALT, hashType) });
  } catch (caught) {
    return error(res, caught, "Payment security check failed.");
  }
};
