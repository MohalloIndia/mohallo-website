// Netlify Function: create-order
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { amount, receipt } = JSON.parse(event.body || "{}");
    if (!Number.isInteger(amount) || amount < 100) return { statusCode: 400, body: JSON.stringify({ error: "Invalid amount." }) };
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return { statusCode: 500, body: JSON.stringify({ error: "Razorpay server keys are not configured." }) };
    const basicAuth = Buffer.from(keyId + ":" + keySecret).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: "Basic " + basicAuth, "Content-Type": "application/json" }, body: JSON.stringify({ amount, currency: "INR", receipt: receipt || "mohallo_" + Date.now() }) });
    if (!response.ok) { console.error(await response.text()); return { statusCode: 500, body: JSON.stringify({ error: "Could not create order." }) }; }
    const order = await response.json();
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: order.id, amount: order.amount, currency: order.currency }) };
  } catch (err) { console.error(err); return { statusCode: 500, body: JSON.stringify({ error: "Server error." }) }; }
};
