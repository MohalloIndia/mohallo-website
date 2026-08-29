const crypto = require("crypto");
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body || "{}");
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return { statusCode: 400, body: JSON.stringify({ verified: false, error: "Missing fields." }) };
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return { statusCode: 500, body: JSON.stringify({ verified: false, error: "Razorpay server key is not configured." }) };
    const expected = crypto.createHmac("sha256", secret).update(razorpay_order_id + "|" + razorpay_payment_id).digest("hex");
    return { statusCode: expected === razorpay_signature ? 200 : 400, body: JSON.stringify({ verified: expected === razorpay_signature, payment_id: razorpay_payment_id }) };
  } catch (err) { console.error(err); return { statusCode: 500, body: JSON.stringify({ verified: false, error: "Server error." }) }; }
};
