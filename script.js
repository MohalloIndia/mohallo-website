// ===== SUPABASE CONNECTION =====
const SUPABASE_URL = "https://lsoyjkuyvijzxqhitgbx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzb3lqa3V5dmlqenhxaGl0Z2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjA3NzYsImV4cCI6MjEwMzEzNjc3Nn0.dvzaAhF_EJqzx3MPAClGlORSdiyWJUmG1U2LYuO-FO0";
const RAZORPAY_KEY_ID = "rzp_test_TVElHzGAS60nJc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Mohallo script connected successfully ✅");

window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  if (!loader) return;
  setTimeout(() => loader.classList.add("hidden"), 1200);
});

const navbar = document.getElementById("navbar");
if (navbar) {
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  });
}

const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    mobileMenu.classList.toggle("active");
  });
  document.querySelectorAll(".mobile-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("active");
      mobileMenu.classList.remove("active");
    });
  });
}

const revealElements = document.querySelectorAll(".reveal");
if (revealElements.length && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.15 });
  revealElements.forEach((el) => revealObserver.observe(el));
}

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const statNumbers = document.querySelectorAll(".stat-number");
if (statNumbers.length && "IntersectionObserver" in window) {
  const countUpObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const finalText = el.textContent.trim();
      const numericPart = finalText.match(/\d+/);
      if (numericPart) {
        const targetNum = parseInt(numericPart[0], 10);
        const prefix = finalText.split(numericPart[0])[0];
        const suffix = finalText.split(numericPart[0])[1];
        let current = 0;
        const duration = 1000;
        const stepTime = Math.max(Math.floor(duration / Math.max(targetNum, 1)), 15);
        const counter = setInterval(() => {
          current++;
          el.textContent = prefix + current + suffix;
          if (current >= targetNum) {
            clearInterval(counter);
            el.textContent = finalText;
          }
        }, stepTime);
      }
      countUpObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  statNumbers.forEach((el) => countUpObserver.observe(el));
}

// ===== SELLER ONBOARDING + MEMBERSHIP PAYMENT =====
const signupModal = document.getElementById("signup-modal");
const signupForm = document.getElementById("signup-form");
const modalSuccess = document.getElementById("modal-success");
const planSelect = document.getElementById("seller-plan");
const sellerBankFields = document.getElementById("seller-bank-fields");
const sellerShopFields = document.getElementById("seller-shop-fields");

function openSignupModal(plan) {
  if (!signupModal) return;
  signupModal.classList.add("active");
  document.body.style.overflow = "hidden";
  if (plan && planSelect) planSelect.value = plan;
}

function closeSignupModal() {
  if (!signupModal) return;
  signupModal.classList.remove("active");
  document.body.style.overflow = "";
  if (signupForm) {
    signupForm.reset();
    signupForm.style.display = "block";
  }
  if (modalSuccess) modalSuccess.classList.remove("active");
  if (sellerBankFields) sellerBankFields.style.display = "block";
  if (sellerShopFields) sellerShopFields.style.display = "block";
  clearFormErrors();
}

function clearFormErrors() {
  document.querySelectorAll(".form-error").forEach((el) => (el.textContent = ""));
  document.querySelectorAll(".form-group input").forEach((el) => el.classList.remove("invalid"));
}

function showError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add("invalid");
  if (error) error.textContent = message;
}

if (signupModal && signupForm) {
  signupModal.addEventListener("click", (e) => {
    if (e.target === signupModal) closeSignupModal();
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFormErrors();

    const name = document.getElementById("seller-name").value.trim();
    const phone = document.getElementById("seller-phone").value.trim();
    const shop = document.getElementById("shop-name").value.trim();
    const plan = document.getElementById("seller-plan").value;
    const password = document.getElementById("seller-password").value;
    const accountName = document.getElementById("seller-account-name")?.value.trim() || "";
    const accountNumber = document.getElementById("seller-account-number")?.value.trim() || "";
    const ifsc = document.getElementById("seller-ifsc")?.value.trim().toUpperCase() || "";
    const address = document.getElementById("seller-address")?.value.trim() || "";

    let isValid = true;
    if (name.length < 2) { showError("seller-name", "error-name", "Please enter your full name."); isValid = false; }
    if (phone.replace(/\D/g, "").length !== 10) { showError("seller-phone", "error-phone", "Enter a valid 10-digit phone number."); isValid = false; }
    if (shop.length < 2) { showError("shop-name", "error-shop", "Please enter your shop name."); isValid = false; }
    if (password.length < 6) { showError("seller-password", "error-password", "Password must be at least 6 characters."); isValid = false; }
    if (accountName.length < 2) { showError("seller-account-name", "error-account-name", "Enter the bank account holder name."); isValid = false; }
    if (!/^\d{9,18}$/.test(accountNumber)) { showError("seller-account-number", "error-account-number", "Enter a valid bank account number."); isValid = false; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { showError("seller-ifsc", "error-ifsc", "Enter a valid IFSC code."); isValid = false; }
    if (address.length < 5) { showError("seller-address", "error-address", "Enter your shop/business address."); isValid = false; }
    if (!isValid) return;

    const submitBtn = signupForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: phone.replace(/\D/g, "") + "@mohalloseller.app",
      password,
      options: { data: { name, phone, shop_name: shop, plan } }
    });

    if (authError || !authData?.user) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Continue to payment";
      showError("shop-name", "error-shop", "Could not create account: " + (authError?.message || "Please try again."));
      return;
    }

    const sellerPayload = {
      user_id: authData.user.id,
      name,
      phone,
      shop_name: shop,
      plan,
      payment_status: "pending",
      bank_account_name: accountName,
      bank_account_number: accountNumber,
      bank_ifsc: ifsc,
      address,
      payout_status: "pending_route_setup"
    };

    const { error: sellerError } = await supabaseClient.from("sellers").upsert(sellerPayload, { onConflict: "user_id" });
    if (sellerError) {
      console.error("Seller profile error:", sellerError);
      submitBtn.disabled = false;
      submitBtn.textContent = "Continue to payment";
      showError("shop-name", "error-shop", "Account created, but shop setup could not be saved. Please contact support.");
      return;
    }

    signupForm.style.display = "none";
    await launchMembershipPayment(plan, phone, shop, authData.user.id);
  });
}

async function launchMembershipPayment(plan, phone, shop, userId) {
  const amountInRupees = plan === "1000" ? 1000 : 300;
  try {
    const orderRes = await fetch("/.netlify/functions/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountInRupees * 100, receipt: "membership_" + phone.replace(/\D/g, "") })
    });
    const order = await orderRes.json();
    if (!order.order_id) throw new Error(order.error || "Could not create membership order.");

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "Mohallo",
      description: "₹" + amountInRupees + "/month - " + shop,
      handler: async function (response) {
        const verifyRes = await fetch("/.netlify/functions/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response)
        });
        const result = await verifyRes.json();
        if (!result.verified) {
          signupForm.style.display = "block";
          showError("shop-name", "error-shop", "Payment could not be verified. Please contact support.");
          return;
        }
        const { error } = await supabaseClient.from("sellers").update({
          payment_status: "paid",
          membership_payment_id: response.razorpay_payment_id
        }).eq("user_id", userId);
        if (error) {
          console.error(error);
          signupForm.style.display = "block";
          showError("shop-name", "error-shop", "Payment succeeded, but your seller profile needs support review.");
          return;
        }
        if (modalSuccess) modalSuccess.classList.add("active");
      },
      prefill: { contact: phone },
      theme: { color: "#E8622C" },
      modal: { ondismiss: () => { signupForm.style.display = "block"; showError("shop-name", "error-shop", "Payment was not completed. You can try again."); } }
    };
    new Razorpay(options).open();
  } catch (err) {
    console.error(err);
    signupForm.style.display = "block";
    showError("shop-name", "error-shop", err.message || "Could not start payment.");
  }
}
