// ===== SELLER DASHBOARD LOGIC =====
let currentSeller = null;
const dashLogin = document.getElementById("dash-login");
const dashMain = document.getElementById("dash-main");
const loginBtn = document.getElementById("login-btn");
const loginPhone = document.getElementById("login-phone");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const productForm = document.getElementById("product-form");
const productsGrid = document.getElementById("products-grid");
const dashEmpty = document.getElementById("dash-empty");
const ordersList = document.getElementById("orders-list");
const ordersEmpty = document.getElementById("orders-empty");

if (dashMain) dashMain.style.display = "none";

loginBtn?.addEventListener("click", async () => {
  loginError.textContent = "";
  const phone = loginPhone.value.trim();
  const password = document.getElementById("login-password").value;
  if (phone.replace(/\D/g, "").length !== 10) { loginError.textContent = "Enter the 10-digit number you signed up with."; return; }
  loginBtn.disabled = true; loginBtn.textContent = "Logging in...";
  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email: phone.replace(/\D/g, "") + "@mohalloseller.app", password });
  if (authError) { loginBtn.disabled = false; loginBtn.textContent = "Log In"; loginError.textContent = "Incorrect phone number or password."; return; }
  const { data, error } = await supabaseClient.from("sellers").select("*").eq("user_id", authData.user.id).limit(1);
  loginBtn.disabled = false; loginBtn.textContent = "Log In";
  if (error || !data?.length) { loginError.textContent = "Could not load your shop details."; return; }
  currentSeller = data[0]; showDashboard();
});

function showDashboard() {
  dashLogin.style.display = "none"; dashMain.style.display = "block";
  document.getElementById("dash-seller-name").textContent = currentSeller.name;
  document.getElementById("dash-shop-info").textContent = currentSeller.shop_name + " · ₹" + currentSeller.plan + "/month plan";
  const payout = document.getElementById("payout-status");
  if (payout) payout.textContent = currentSeller.payout_status === "active" ? "Payout account active" : "Payout account pending Route approval";
  loadProducts(); loadOrders();
}

logoutBtn?.addEventListener("click", async () => {
  await supabaseClient.auth.signOut(); currentSeller = null;
  dashMain.style.display = "none"; dashLogin.style.display = "flex"; loginPhone.value = "";
});

async function loadProducts() {
  const { data, error } = await supabaseClient.from("products").select("*").eq("seller_id", currentSeller.id).order("created_at", { ascending: false });
  if (error) { console.error(error); return; } renderProducts(data);
}

function renderProducts(products) {
  productsGrid.innerHTML = "";
  if (!products?.length) { productsGrid.appendChild(dashEmpty); return; }
  products.forEach((product) => {
    const card = document.createElement("div"); card.className = "product-card";
    card.innerHTML = `<h4>${escapeHtml(product.product_name)}</h4><p class="product-price">₹${escapeHtml(product.price)}</p><p class="product-desc">${escapeHtml(product.description || "")}</p><button class="btn btn-text product-delete" data-id="${product.id}">Delete</button>`;
    productsGrid.appendChild(card);
  });
  document.querySelectorAll(".product-delete").forEach((btn) => btn.addEventListener("click", async () => {
    const id = btn.dataset.id; btn.textContent = "Deleting...";
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if (error) { console.error(error); btn.textContent = "Delete"; return; } loadProducts();
  }));
}

async function loadOrders() {
  const { data, error } = await supabaseClient.from("orders").select("*, products(product_name)").eq("seller_id", currentSeller.id).order("created_at", { ascending: false });
  if (error) { console.error("Orders load error:", error); return; } renderOrders(data);
}

function renderOrders(orders) {
  ordersList.innerHTML = "";
  if (!orders?.length) { ordersList.appendChild(ordersEmpty); return; }
  orders.forEach((order) => {
    const productName = order.products?.product_name || "Product";
    const row = document.createElement("div"); row.className = "order-card";
    row.innerHTML = `<div class="order-main"><h4>${escapeHtml(productName)}</h4><p class="order-buyer">${escapeHtml(order.buyer_name)} · ${escapeHtml(order.buyer_phone)}</p>${order.buyer_address ? `<p class="order-address">📍 ${escapeHtml(order.buyer_address)}</p>` : ""}</div><div class="order-amount">₹${escapeHtml(order.amount)}</div>`;
    ordersList.appendChild(row);
  });
}

function escapeHtml(str) { const div = document.createElement("div"); div.textContent = String(str ?? ""); return div.innerHTML; }

productForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("product-name").value.trim();
  const price = document.getElementById("product-price").value.trim();
  const desc = document.getElementById("product-desc").value.trim();
  if (!name || !/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) return;
  const submitBtn = productForm.querySelector("button[type='submit']"); submitBtn.disabled = true; submitBtn.textContent = "Adding...";
  const { error } = await supabaseClient.from("products").insert([{ seller_id: currentSeller.id, product_name: name, price, description: desc }]);
  submitBtn.disabled = false; submitBtn.textContent = "Add Product";
  if (error) { console.error(error); return; }
  productForm.reset(); loadProducts();
});

(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const { data } = await supabaseClient.from("sellers").select("*").eq("user_id", session.user.id).limit(1);
  if (data?.length) { currentSeller = data[0]; showDashboard(); }
})();
