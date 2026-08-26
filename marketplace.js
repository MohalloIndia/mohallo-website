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
    `;
    marketGrid.appendChild(card);
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

loadMarketplace();