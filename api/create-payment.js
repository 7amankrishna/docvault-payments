const { randomBytes } = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { db, requireUser } = require("../lib/firebase");
const { body, error, method, send } = require("../lib/http");
const { formatAmount } = require("../lib/payu");

function cleanName(value) {
  const name = String(value || "").trim().split(/\s+/)[0].replace(/[^a-zA-Z]/g, "");
  return name || "User";
}

module.exports = async (req, res) => {
  if (!method(req, res)) return;
  try {
    const user = await requireUser(req);
    const input = body(req);
    const phone = String(input.phone || "").replace(/\D/g, "");
    if (!user.email) throw new Error("Your account needs an email address.");
    if (!/^\d{10}$/.test(phone)) throw new Error("Enter a valid 10-digit mobile number.");

    const config = (await db().doc("config/app").get()).data();
    if (!config) throw new Error("Subscription pricing is not configured.");
    const amount = formatAmount(config.subscriptionPrice);
    const durationDays = Number(config.subscriptionDurationDays);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 366) throw new Error("Subscription duration is invalid.");

    const environment = String(process.env.PAYU_ENVIRONMENT || "test").toLowerCase();
    if (!["test", "production"].includes(environment)) throw new Error("PAYU_ENVIRONMENT must be test or production.");
    const isProduction = environment === "production";
    const successUrl = process.env.PAYU_SUCCESS_URL || "https://cbjs.payu.in/sdk/success";
    const failureUrl = process.env.PAYU_FAILURE_URL || "https://cbjs.payu.in/sdk/failure";
    if (isProduction && (!process.env.PAYU_SUCCESS_URL || !process.env.PAYU_FAILURE_URL)) {
      throw new Error("Configure production PayU callback URLs before going live.");
    }

    const transactionId = `DV${Date.now()}${randomBytes(4).toString("hex")}`;
    await db().doc(`payments/${transactionId}`).create({
      transactionId,
      userId: user.uid,
      amount,
      currency: String(config.subscriptionCurrency || "INR"),
      durationDays,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    return send(res, 200, {
      transactionId,
      amount,
      key: process.env.PAYU_KEY,
      email: user.email,
      firstName: cleanName(input.name),
      productName: String(config.subscriptionPlanName || "DocVault Premium").trim().slice(0, 100),
      successUrl,
      failureUrl,
      isProduction,
    });
  } catch (caught) {
    return error(res, caught, "Unable to start payment.");
  }
};
