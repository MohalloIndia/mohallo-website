// ===== MARKETPLACE LOGIC =====

const marketGrid = document.getElementById("market-grid");
const marketCount = document.getElementById("market-count");
const searchInput = document.getElementById("search-input");

let allProducts = [];

async function loadMarketplace() {
  // Only select the specific columns we actually need - never phone numbers
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, product_name, price, description, seller_id, sellers(shop_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Marketplace load error:", error);
    marketCount.textContent = "Could not load products right now.";
    return;
  }

  allProducts = data || [];
  renderResults(allProducts);
}

function renderResults(products) {
  marketGrid.innerHTML = "";

  if (!products || products.length === 0) {
    marketCount.textContent = "No products found.";
    return;
  }

  marketCount.textContent = products.length + " product" + (products.length === 1 ? "" : "s") + " found";

  products.forEach((product) => {
    const shopName = product.sellers ? product.sellers.shop_name : "Mohallo Seller";

    const card = document.createElement("div");
    card.className = "market-card";
    card.innerHTML = `
      <div class="market-card-icon">🛍️</div>
      <h4>${escapeHtml(product.product_name)}</h4>
      <p class="market-card-price">₹${escapeHtml(product.price)}</p>
      <p class="market-card-desc">${escapeHtml(product.description || "No description provided.")}</p>
      <p class="market-card-shop">📍 ${escapeHtml(shopName)}</p>
      <button class="btn btn-primary btn-block buy-btn"
        data-id="${product.id}"
        data-seller="${product.seller_id}"
        data-name="${escapeHtml(product.product_name)}"
        data-price="${escapeHtml(product.price)}">
        Buy Now
      </button>
    `;
    marketGrid.appendChild(card);
  });

  // Wire up every Buy Now button on the page
  document.querySelectorAll(".buy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openBuyModal({
        productId: btn.dataset.id,
        sellerId: btn.dataset.seller,
        name: btn.dataset.name,
        price: btn.dataset.price,
      });
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    renderResults(allProducts);
    return;
  }

  const filtered = allProducts.filter((product) => {
    const name = (product.product_name || "").toLowerCase();
    const desc = (product.description || "").toLowerCase();
    const shop = product.sellers ? product.sellers.shop_name.toLowerCase() : "";
    return name.includes(query) || desc.includes(query) || shop.includes(query);
  });

  renderResults(filtered);
});

// ===== BUY MODAL LOGIC =====

const buyModal = document.getElementById("buy-modal");
const buyForm = document.getElementById("buy-form");
const buySuccess = document.getElementById("buy-success");
const buyProductName = document.getElementById("buy-product-name");
const buyProductPrice = document.getElementById("buy-product-price");

let currentPurchase = null;

function openBuyModal(product) {
  currentPurchase = product;
  buyProductName.textContent = product.name;
  buyProductPrice.textContent = "₹" + product.price;
  buyForm.reset();
  buyForm.style.display = "block";
  buySuccess.classList.remove("active");
  buyModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeBuyModal() {
  buyModal.classList.remove("active");
  document.body.style.overflow = "";
}

buyModal.addEventListener("click", (e) => {
  if (e.target === buyModal) closeBuyModal();
});

buyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  document.querySelectorAll("#buy-form .form-error").forEach((el) => (el.textContent = ""));

  const name = document.getElementById("buyer-name").value.trim();
  const phone = document.getElementById("buyer-phone").value.trim();
  const address = document.getElementById("buyer-address").value.trim();

  let isValid = true;

  if (name.length < 2) {
    document.getElementById("error-buyer-name").textContent = "Please enter your name.";
    isValid = false;
  }

  const phoneDigitsOnly = phone.replace(/\D/g, "");
  if (phoneDigitsOnly.length !== 10) {
    document.getElementById("error-buyer-phone").textContent = "Enter a valid 10-digit phone number.";
    isValid = false;
  }

  if (!isValid) return;

  // Price is stored as plain text (e.g. "550") - pull out just the digits
  const priceNumber = parseInt(currentPurchase.price.replace(/\D/g, ""), 10);
  if (!priceNumber || priceNumber < 1) {
    document.getElementById("error-buyer-phone").textContent = "This product's price looks invalid.";
    return;
  }

  const submitBtn = buyForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Starting payment...";

  // Step 1: create a real Razorpay order via our secure Netlify function
  const orderRes = await fetch("/.netlify/functions/create-order", {
    method: "POST",
    body: JSON.stringify({
      amount: priceNumber * 100, // paise
      receipt: "order_" + currentPurchase.productId + "_" + Date.now(),
    }),
  });
  const order = await orderRes.json();

  submitBtn.disabled = false;
  submitBtn.textContent = "Pay & Buy";

  if (!order.order_id) {
    document.getElementById("error-buyer-phone").textContent = "Could not start payment. Please try again.";
    return;
  }

  const options = {
    key: "rzp_test_TVElHzGAS60nJc", // Key ID only - safe in the browser
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name: "Mohallo",
    description: currentPurchase.name,
    handler: async function (response) {
      // Step 2: verify the payment is real using our Netlify function
      const verifyRes = await fetch("/.netlify/functions/verify-payment", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });
      const result = await verifyRes.json();

      if (!result.verified) {
        document.getElementById("error-buyer-phone").textContent =
          "Payment could not be verified. Please contact support.";
        return;
      }

      // Step 3: save the order so the seller can see it
      const { error: orderError } = await supabaseClient.from("orders").insert([
        {
          product_id: currentPurchase.productId,
          seller_id: currentPurchase.sellerId,
          buyer_name: name,
          buyer_phone: phone,
          buyer_address: address,
          amount: String(priceNumber),
          razorpay_payment_id: response.razorpay_payment_id,
          status: "paid",
        },
      ]);

      if (orderError) {
        console.error("Order save error:", orderError);
      }

      buyForm.style.display = "none";
      buySuccess.classList.add("active");
    },
    prefill: { contact: phone, name: name },
    theme: { color: "#E8622C" },
    modal: {
      ondismiss: function () {
        document.getElementById("error-buyer-phone").textContent = "Payment was not completed.";
      },
    },
  };

  const rzp = new Razorpay(options);
  rzp.open();
});

loadMarketplace();
