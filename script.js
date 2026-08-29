// ===== SUPABASE CONNECTION =====
const SUPABASE_URL = "https://lsoyjkuyvijzxqhitgbx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzb3lqa3V5dmlqenhxaGl0Z2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjA3NzYsImV4cCI6MjEwMzEzNjc3Nn0.dvzaAhF_EJqzx3MPAClGlORSdiyWJUmG1U2LYuO-FO0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Mohallo script connected successfully ✅");

window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  if (!loader) return;

  setTimeout(() => {
    loader.classList.add("hidden");
  }, 1200);
});

const navbar = document.getElementById("navbar");

if (navbar) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
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

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.15 }
);

revealElements.forEach((el) => revealObserver.observe(el));

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const statNumbers = document.querySelectorAll(".stat-number");

const countUpObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const finalText = el.textContent.trim();
        const numericPart = finalText.match(/\d+/);

        if (numericPart) {
          const targetNum = parseInt(numericPart[0]);
          const prefix = finalText.split(numericPart[0])[0];
          const suffix = finalText.split(numericPart[0])[1];
          let current = 0;
          const duration = 1000;
          const stepTime = Math.max(Math.floor(duration / targetNum), 15);

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
      }
    });
  },
  { threshold: 0.5 }
);

statNumbers.forEach((el) => countUpObserver.observe(el));

// ===== SIGNUP MODAL + MEMBERSHIP PAYMENT ===== (only runs on pages that have the modal)

const signupModal = document.getElementById("signup-modal");
const signupForm = document.getElementById("signup-form");
const modalSuccess = document.getElementById("modal-success");
const planSelect = document.getElementById("seller-plan");

function openSignupModal(plan) {
  if (!signupModal) return;
  signupModal.classList.add("active");
  document.body.style.overflow = "hidden";

  if (plan) {
    planSelect.value = plan;
  }
}

function closeSignupModal() {
  if (!signupModal) return;
  signupModal.classList.remove("active");
  document.body.style.overflow = "";

  signupForm.reset();
  signupForm.style.display = "block";
  modalSuccess.classList.remove("active");
  clearFormErrors();
}

function clearFormErrors() {
  document.querySelectorAll(".form-error").forEach((el) => (el.textContent = ""));
  document.querySelectorAll(".form-group input").forEach((el) => el.classList.remove("invalid"));
}

function showError(inputId, errorId, message) {
  document.getElementById(inputId).classList.add("invalid");
  document.getElementById(errorId).textContent = message;
}

if (signupModal && signupForm) {
  signupModal.addEventListener("click", (e) => {
    if (e.target === signupModal) {
      closeSignupModal();
    }
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFormErrors();

    const name = document.getElementById("seller-name").value.trim();
    const phone = document.getElementById("seller-phone").value.trim();
    const shop = document.getElementById("shop-name").value.trim();
    const plan = document.getElementById("seller-plan").value;
    const password = document.getElementById("seller-password").value;

    let isValid = true;

    if (name.length < 2) {
      showError("seller-name", "error-name", "Please enter your full name.");
      isValid = false;
    }

    const phoneDigitsOnly = phone.replace(/\D/g, "");
    if (phoneDigitsOnly.length !== 10) {
      showError("seller-phone", "error-phone", "Enter a valid 10-digit phone number.");
      isValid = false;
    }

    if (shop.length < 2) {
      showError("shop-name", "error-shop", "Please tell us what you'd like to sell.");
      isValid = false;
    }

    if (password.length < 6) {
      showError("seller-password", "error-password", "Password must be at least 6 characters.");
      isValid = false;
    }

    if (!isValid) return;

    const submitBtn = signupForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: phone + "@mohalloseller.app",
      password: password,
      options: {
        data: {
          name: name,
          phone: phone,
          shop_name: shop,
          plan: plan,
        },
      },
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";

    if (authError) {
      console.error("Auth signup error:", authError);
      showError("shop-name", "error-shop", "Could not create account: " + authError.message);
      return;
    }

    // Account created - now collect the membership payment
    signupForm.style.display = "none";
    launchMembershipPayment(plan, phone, shop, authData.user.id);
  });
}

async function launchMembershipPayment(plan, phone, shop, userId) {
  const amountInRupees = plan === "1000" ? 1000 : 300;

  const orderRes = await fetch("/.netlify/functions/create-order", {
    method: "POST",
    body: JSON.stringify({
      amount: amountInRupees * 100,
      receipt: "membership_" + phone,
    }),
  });
  const order = await orderRes.json();

  if (!order.order_id) {
    showError("shop-name", "error-shop", "Could not start payment. Please try again.");
    signupForm.style.display = "block";
    return;
  }

  const options = {
    key: "rzp_test_TVElHzGAS60nJc",
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name: "Mohallo",
    description: "₹" + amountInRupees + "/month - " + shop,
    handler: async function (response) {
      const verifyRes = await fetch("/.netlify/functions/verify-payment", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });
      const result = await verifyRes.json();

      if (result.verified) {
        await supabaseClient
          .from("sellers")
          .update({ payment_status: "paid" })
          .eq("user_id", userId);

        modalSuccess.classList.add("active");
      } else {
        showError("shop-name", "error-shop", "Payment could not be verified. Please contact support.");
        signupForm.style.display = "block";
      }
    },
    prefill: { contact: phone },
    theme: { color: "#E8622C" },
    modal: {
      ondismiss: function () {
        showError("shop-name", "error-shop", "Payment was not completed. You can try again from your dashboard.");
        signupForm.style.display = "block";
      },
    },
  };

  const rzp = new Razorpay(options);
  rzp.open();
}
