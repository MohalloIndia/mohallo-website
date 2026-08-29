// Runs on Netlify's servers, never in the browser.
// RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET come from Netlify's Environment
// Variables settings - they are never written in this file.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { amount, receipt } = JSON.parse(event.body);

    // amount must be in paise (₹300 = 30000 paise). Razorpay's minimum is 100 paise.
    if (!amount || amount < 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid amount." }),
      };
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const basicAuth = Buffer.from(keyId + ":" + keySecret).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + basicAuth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: "INR",
        receipt: receipt || "mohallo_" + Date.now(),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Razorpay order creation failed:", errText);
      return { statusCode: 500, body: JSON.stringify({ error: "Could not create order." }) };
    }

    const order = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      }),
    };
  } catch (err) {
    console.error("create-order error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error." }) };
  }
};
