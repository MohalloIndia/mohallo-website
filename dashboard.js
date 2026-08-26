// ===== DASHBOARD LOGIC =====

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

// Hide dashboard by default until login succeeds
dashMain.style.display = "none";

loginBtn.addEventListener("click", async () => {
  loginError.textContent = "";
  const phone = loginPhone.value.trim();
  const password = document.getElementById("login-password").value;

  if (phone.replace(/\D/g, "").length !== 10) {
    loginError.textContent = "Enter the 10-digit number you signed up with.";
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
    email: phone + "@mohalloseller.app",
    password: password,
  });

  if (authError) {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log In";
    loginError.textContent = "Incorrect phone number or password.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("sellers")
    .select("*")
    .eq("user_id", authData.user.id)
    .limit(1);

  loginBtn.disabled = false;
  loginBtn.textContent = "Log In";

  if (error || !data || data.length === 0) {
    loginError.textContent = "Could not load your shop details.";
    return;
  }

  currentSeller = data[0];
  showDashboard();
});

function showDashboard() {
  dashLogin.style.display = "none";
  dashMain.style.display = "block";

  document.getElementById("dash-seller-name").textContent = currentSeller.name;
  document.getElementById("dash-shop-info").textContent =
    currentSeller.shop_name + " · ₹" + currentSeller.plan + "/month plan";

  loadProducts();
}

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentSeller = null;
  dashMain.style.display = "none";
  dashLogin.style.display = "flex";
  loginPhone.value = "";
});

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("seller_id", currentSeller.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  renderProducts(data);
}

function renderProducts(products) {
  productsGrid.innerHTML = "";

  if (!products || products.length === 0) {
    productsGrid.appendChild(dashEmpty);
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <h4>${escapeHtml(product.product_name)}</h4>
      <p class="product-price">₹${escapeHtml(product.price)}</p>
      <p class="product-desc">${escapeHtml(product.description || "")}</p>
      <button class="btn btn-text product-delete" data-id="${product.id}">Delete</button>
    `;
    productsGrid.appendChild(card);
  });

  // Wire up delete buttons
  document.querySelectorAll(".product-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      btn.textContent = "Deleting...";
      const { error } = await supabaseClient.from("products").delete().eq("id", id);
      if (error) {
        console.error(error);
        return;
      }
      loadProducts();
    });
  });
}

// Basic escaping so product text can't break the page's HTML
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("product-name").value.trim();
  const price = document.getElementById("product-price").value.trim();
  const desc = document.getElementById("product-desc").value.trim();

  if (!name || !price) return;

  const submitBtn = productForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding...";

  const { error } = await supabaseClient.from("products").insert([
    {
      seller_id: currentSeller.id,
      product_name: name,
      price: price,
      description: desc,
    },
  ]);

  submitBtn.disabled = false;
  submitBtn.textContent = "Add Product";

  if (error) {
    console.error(error);
    return;
  }

  productForm.reset();
  loadProducts();
});

// Auto-login if there's already an active session (e.g. returning visitor)
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    const { data } = await supabaseClient
      .from("sellers")
      .select("*")
      .eq("user_id", session.user.id)
      .limit(1);
    if (data && data.length > 0) {
      currentSeller = data[0];
      showDashboard();
    }
  }
})();