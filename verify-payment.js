// Verifies that a payment genuinely succeeded, using Node's built-in
// crypto module - no extra packages to install.

const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { statusCode: 400, body: JSON.stringify({ verified: false, error: "Missing fields." }) };
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return { statusCode: 400, body: JSON.stringify({ verified: false }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ verified: true, payment_id: razorpay_payment_id }),
    };
  } catch (err) {
    console.error("verify-payment error:", err);
    return { statusCode: 500, body: JSON.stringify({ verified: false, error: "Server error." }) };
  }
};
