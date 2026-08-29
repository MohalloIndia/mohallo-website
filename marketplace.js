// ===== SHOP-FIRST MARKETPLACE + CART =====
const marketGrid = document.getElementById("market-grid");
const marketCount = document.getElementById("market-count");
const searchInput = document.getElementById("search-input");
const shopModal = document.getElementById("shop-modal");
const cartModal = document.getElementById("cart-modal");
const shopTitle = document.getElementById("shop-title");
const shopSubtitle = document.getElementById("shop-subtitle");
const shopProducts = document.getElementById("shop-products");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const buyForm = document.getElementById("buy-form");
const buySuccess = document.getElementById("buy-success");
let allProducts = [];
let shops = [];
let currentShop = null;
let cart = [];

const esc = (value) => { const d = document.createElement("div"); d.textContent = String(value ?? ""); return d.innerHTML; };
const rupees = (value) => Number(String(value).replace(/[^0-9.]/g, "")) || 0;

async function loadMarketplace() {
  const { data, error } = await supabaseClient.from("products").select("id, product_name, price, description, seller_id, sellers(id, shop_name)").order("created_at", { ascending: false });
  if (error) { console.error(error); marketCount.textContent = "Could not load shops right now."; return; }
  allProducts = data || [];
  buildShops(); renderShops(shops);
}

function buildShops() {
  const map = new Map();
  allProducts.forEach((product) => {
    const seller = product.sellers || {};
    const id = product.seller_id;
    if (!map.has(id)) map.set(id, { sellerId: id, shopName: seller.shop_name || "Mohallo Shop", products: [] });
    map.get(id).products.push(product);
  });
  shops = [...map.values()];
}

function renderShops(list) {
  marketGrid.innerHTML = "";
  marketCount.textContent = list.length + " shop" + (list.length === 1 ? "" : "s") + " found";
  if (!list.length) { marketGrid.innerHTML = '<p class="dash-empty">No shops found.</p>'; return; }
  list.forEach((shop) => {
    const card = document.createElement("div"); card.className = "market-card";
    card.innerHTML = `<div class="market-card-icon">🏪</div><h4>${esc(shop.shopName)}</h4><p class="market-card-desc">${shop.products.length} product${shop.products.length === 1 ? "" : "s"} listed</p><p class="market-card-shop">📍 Local Mohallo seller</p><button class="btn btn-primary btn-block">View Shop</button>`;
    card.querySelector("button").addEventListener("click", () => openShop(shop));
    marketGrid.appendChild(card);
  });
}

function openShop(shop) {
  currentShop = shop;
  cart = [];
  shopTitle.textContent = shop.shopName;
  shopSubtitle.textContent = "Choose products from this shop and add them to your cart.";
  renderShopProducts();
  shopModal.classList.add("active"); document.body.style.overflow = "hidden";
}

function renderShopProducts() {
  shopProducts.innerHTML = "";
  currentShop.products.forEach((product) => {
    const row = document.createElement("div");
    row.style.marginBottom = "14px";
    row.innerHTML = `<h4>${esc(product.product_name)}</h4><p class="product-price">₹${esc(product.price)}</p><p class="product-desc">${esc(product.description || "")}</p><button class="btn btn-outline btn-block">Add to Cart</button>`;
    row.querySelector("button").addEventListener("click", () => addToCart(product));
    shopProducts.appendChild(row);
  });
}

function addToCart(product) {
  const existing = cart.find((item) => item.id === product.id);
  if (existing) existing.quantity += 1; else cart.push({ ...product, quantity: 1 });
  renderShopProducts();
}

function openCart() {
  if (!cart.length) { alert("Your cart is empty."); return; }
  shopModal.classList.remove("active");
  renderCart(); cartModal.classList.add("active");
}

function renderCart() {
  cartItems.innerHTML = "";
  let total = 0;
  cart.forEach((item) => {
    const line = rupees(item.price) * item.quantity; total += line;
    const row = document.createElement("div"); row.style.marginBottom = "12px";
    row.innerHTML = `<strong>${esc(item.product_name)}</strong><p>₹${line.toFixed(2)} · Qty ${item.quantity}</p><button class="btn btn-text">Remove</button>`;
    row.querySelector("button").addEventListener("click", () => { cart = cart.filter((x) => x.id !== item.id); renderCart(); });
    cartItems.appendChild(row);
  });
  cartTotal.textContent = "Total: ₹" + total.toFixed(2);
}

function closeModal(modal) { modal.classList.remove("active"); document.body.style.overflow = ""; }
document.getElementById("shop-close").addEventListener("click", () => closeModal(shopModal));
document.getElementById("cart-close").addEventListener("click", () => closeModal(cartModal));
document.getElementById("open-cart-btn").addEventListener("click", openCart);
document.getElementById("success-close").addEventListener("click", () => closeModal(cartModal));
shopModal.addEventListener("click", (e) => { if (e.target === shopModal) closeModal(shopModal); });
cartModal.addEventListener("click", (e) => { if (e.target === cartModal) closeModal(cartModal); });

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return renderShops(shops);
  renderShops(shops.filter((shop) => shop.shopName.toLowerCase().includes(q) || shop.products.some((p) => (p.product_name || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q))));
});

buyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.querySelectorAll("#buy-form .form-error").forEach((x) => x.textContent = "");
  const name = document.getElementById("buyer-name").value.trim();
  const phone = document.getElementById("buyer-phone").value.trim();
  const address = document.getElementById("buyer-address").value.trim();
  let valid = true;
  if (name.length < 2) { document.getElementById("error-buyer-name").textContent = "Please enter your name."; valid = false; }
  if (phone.replace(/\D/g, "").length !== 10) { document.getElementById("error-buyer-phone").textContent = "Enter a valid 10-digit phone number."; valid = false; }
  if (address.length < 5) { document.getElementById("error-buyer-address").textContent = "Enter a delivery address."; valid = false; }
  if (!valid) return;
  const total = cart.reduce((sum, item) => sum + rupees(item.price) * item.quantity, 0);
  const submit = buyForm.querySelector("button[type='submit']"); submit.disabled = true; submit.textContent = "Starting payment...";
  try {
    const orderRes = await fetch("/.netlify/functions/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(total * 100), receipt: "order_" + Date.now() }) });
    const order = await orderRes.json();
    if (!order.order_id) throw new Error(order.error || "Could not start payment.");
    new Razorpay({
      key: RAZORPAY_KEY_ID, amount: order.amount, currency: order.currency, order_id: order.order_id, name: "Mohallo", description: currentShop.shopName,
      prefill: { name, contact: phone }, theme: { color: "#E8622C" },
      handler: async (response) => {
        const verifyRes = await fetch("/.netlify/functions/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(response) });
        const result = await verifyRes.json();
        if (!result.verified) throw new Error("Payment could not be verified.");
        for (const item of cart) {
          const { error } = await supabaseClient.from("orders").insert([{ product_id: item.id, seller_id: item.seller_id, buyer_name: name, buyer_phone: phone, buyer_address: address, amount: String((rupees(item.price) * item.quantity).toFixed(2)), razorpay_payment_id: response.razorpay_payment_id, status: "paid", quantity: item.quantity }]);
          if (error) throw error;
        }
        buyForm.style.display = "none"; buySuccess.classList.add("active"); cart = [];
      },
      modal: { ondismiss: () => { submit.disabled = false; submit.textContent = "Pay & Buy"; } }
    }).open();
  } catch (err) {
    console.error(err); document.getElementById("error-buyer-address").textContent = err.message || "Payment could not be started."; submit.disabled = false; submit.textContent = "Pay & Buy";
  }
});

loadMarketplace();
