
// ============================================================================
// DOM ELEMENTS
// ============================================================================

const $ = (id) => document.getElementById(id);

// ============================================================================
// STATE & VARIABLES
// ============================================================================

let menuData = [];
const order = new Map();

const TAX_RATE = 0.075;
let tipAmount = 0;
let activeTipPct = null;

const categoryOrder = [
  "Appetizers",
  "Salads",
  "Soups",
  "Pork",
  "Beef",
  "Chicken",
  "Duck",
  "Seafood",
  "Moo Shu",
  "Tofu and Vegetable",
  "House Specialties",
  "Health Conscious",
  "Fried Rice or Lo Mein",
  "Egg Foo Young",
  "Noodle",
  "Combinations",
  "Traditional Chinese Cuisine",
  "Hot Pot",
  "Dessert",
  "Beverages",
  "Hunan Special Meal Combo",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function money(n) {
  return `$${n.toFixed(2)}`;
}

function label(item) {
  const en = item.code ? `${item.code} ${item.en}` : item.en;
  return $("mode").value === "both" && item.zh ? `${en} / ${item.zh}` : en;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = h === 'price' ? parseFloat(values[i]) : values[i];
    });
    return obj;
  });
}

// ============================================================================
// CALCULATIONS
// ============================================================================

function calculateSubtotal() {
  let subtotal = 0;
  order.forEach((v) => {
    subtotal += v.item.price * v.qty;
  });
  return subtotal;
}

function calculateTax(subtotal) {
  return subtotal * TAX_RATE;
}

function calculateTotals() {
  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const total = subtotal + tax + tipAmount;
  return { subtotal, tax, tip: tipAmount, total };
}

function setTipByPercent(pct) {
  activeTipPct = pct;
  const subtotal = calculateSubtotal();
  tipAmount = subtotal * (pct / 100);
  $("tipInput").value = "";
  updateTotalsDisplay();
}

function setTipByAmount(amount) {
  activeTipPct = null;
  tipAmount = amount >= 0 ? amount : 0;
  updateTotalsDisplay();
}

function recalcTipIfPercent() {
  if (activeTipPct !== null) {
    const subtotal = calculateSubtotal();
    tipAmount = subtotal * (activeTipPct / 100);
  }
}

function updateTotalsDisplay() {
  const { subtotal, tax, tip, total } = calculateTotals();
  $("subtotal").textContent = money(subtotal);
  $("tax").textContent = money(tax);
  $("tipDisplay").textContent = money(tip);
  $("total").textContent = money(total);

  // Highlight active tip button
  document.querySelectorAll(".tip-btn").forEach((btn) => {
    const pct = parseInt(btn.dataset.pct, 10);
    btn.classList.toggle("active", activeTipPct === pct);
  });
}

// ============================================================================
// RECEIPT GENERATION
// ============================================================================

function genReceipt() {
  const { subtotal, tax, tip, total } = calculateTotals();
  const parts = [];

  parts.push(`<div class="rc-center">Hunam Chinese Restaurant / 南苑餐厅</div>`);
  parts.push(`<div class="rc-center rc-small">790 Martin Luther King Jr Blvd, Chapel Hill, NC 27514</div>`);
  parts.push(`<div class="rc-divider"></div>`);

  const meta = `${$("type").value}${$("who").value ? " | " + $("who").value : ""}`;
  parts.push(`<div class="rc-center rc-small">${meta}</div>`);
  parts.push(`<div class="rc-center rc-small">${new Date().toLocaleString()}</div>`);
  parts.push(`<div class="rc-divider"></div>`);

  order.forEach((v) => {
    parts.push(`<div class="rc-item"><span>${v.qty} x ${label(v.item)}</span><span>${money(v.qty * v.item.price)}</span></div>`);
  });

  parts.push(`<div class="rc-divider"></div>`);
  parts.push(`<div class="rc-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>`);
  parts.push(`<div class="rc-row"><span>Tax (7.5%)</span><span>${money(tax)}</span></div>`);
  parts.push(`<div class="rc-row"><span>Tip</span><span>${money(tip)}</span></div>`);
  parts.push(`<div class="rc-divider"></div>`);
  parts.push(`<div class="rc-row rc-total"><span>Total</span><span>${money(total)}</span></div>`);

  if ($("note").value.trim()) {
    parts.push(`<div class="rc-divider"></div>`);
    parts.push(`<div class="rc-note"><strong>NOTE:</strong> ${$("note").value.trim()}</div>`);
  }

  parts.push(`<div class="rc-divider"></div>`);
  parts.push(`<div class="rc-center rc-thank">Thank you! 欢迎再次光临！</div>`);

  $("receipt").innerHTML = parts.join("");
}

// ============================================================================
// CART OPERATIONS
// ============================================================================

function add(item) {
  const key = item.code;
  const v = order.get(key) || { item, qty: 0 };
  v.qty++;
  order.set(key, v);
  renderOrder();
}

function remove(key) {
  order.delete(key);
  renderOrder();
}

function decrementItem(key) {
  const v = order.get(key);
  if (v) {
    v.qty--;
    if (v.qty <= 0) order.delete(key);
    renderOrder();
  }
}

function incrementItem(key) {
  const v = order.get(key);
  if (v) {
    v.qty++;
    renderOrder();
  }
}

function clearOrder() {
  order.clear();
  tipAmount = 0;
  activeTipPct = null;
  $("tipInput").value = "";
  renderOrder();
  $("receipt").innerHTML = "";
}

// ============================================================================
// MENU RENDERING
// ============================================================================

function renderMenu() {
  const root = $("menu");
  root.innerHTML = "";

  categoryOrder.forEach((cat) => {
    const items = menuData.filter((x) => x.category === cat);
    if (!items.length) return;

    const sec = document.createElement("div");
    sec.className = "cat";
    sec.id = `cat-${cat.replace(/\s+/g, '-').toLowerCase()}`;
    sec.innerHTML = `<h2>${cat}</h2><div class="grid"></div>`;

    const grid = sec.querySelector(".grid");
    items.forEach((item) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="row">
          <div class="name">${label(item)}</div>
          <div class="price">${money(item.price)}</div>
        </div>
        <button class="add">Add</button>
      `;
      el.querySelector("button").onclick = () => add(item);
      grid.appendChild(el);
    });

    root.appendChild(sec);
  });

  renderCategoryNavigator();
  setupScrollTracking();
}

// ============================================================================
// ORDER RENDERING
// ============================================================================

function renderOrder() {
  const root = $("order");
  root.innerHTML = "";
  let subtotal = 0;

  order.forEach((v, key) => {
    const el = document.createElement("div");
    el.className = "line";
    el.innerHTML = `
      <div>
        <div style="font-weight:900">${label(v.item)}</div>
        <div class="small">${money(v.item.price)} each</div>
      </div>
      <div class="qty">
        <button>-</button>
        <span>${v.qty}</span>
        <button>+</button>
      </div>
      <button>🗑</button>
    `;

    const btns = el.querySelectorAll("button");
    btns[0].onclick = () => decrementItem(key);
    btns[1].onclick = () => incrementItem(key);
    btns[2].onclick = () => remove(key);

    root.appendChild(el);
  });

  recalcTipIfPercent();
  updateTotalsDisplay();
}

// ============================================================================
// CATEGORY NAVIGATOR
// ============================================================================

function renderCategoryNavigator() {
  const nav = $("categoryNav");
  nav.innerHTML = "";

  const availableCategories = categoryOrder.filter(cat =>
    menuData.some(item => item.category === cat)
  );

  availableCategories.forEach(cat => {
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = cat;
    link.className = "cat-link";
    link.dataset.category = cat;
    link.onclick = (e) => {
      e.preventDefault();
      scrollToCategory(cat);
    };
    nav.appendChild(link);
  });
}

function scrollToCategory(category) {
  const catId = `cat-${category.replace(/\s+/g, '-').toLowerCase()}`;
  const element = $(catId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ============================================================================
// SCROLLING BEHAVIOR
// ============================================================================

function setupScrollTracking() {
  const menuContent = $("menu").parentElement;
  if (!menuContent) return;

  menuContent.addEventListener("scroll", updateActiveCategory, { passive: true });
}

function updateActiveCategory() {
  const menuContent = $("menu").parentElement;
  const menuItems = $("menu");
  if (!menuContent || !menuItems) return;

  const categories = menuItems.querySelectorAll(".cat");
  let activeCategory = null;

  categories.forEach(cat => {
    const rect = cat.getBoundingClientRect();
    const containerRect = menuContent.getBoundingClientRect();
    
    // Check if category header is in viewport
    if (rect.top < containerRect.top + 120) {
      activeCategory = cat.id;
    }
  });

  // Update navigator highlights
  const links = document.querySelectorAll(".cat-link");
  links.forEach(link => {
    const catId = `cat-${link.dataset.category.replace(/\s+/g, '-').toLowerCase()}`;
    link.classList.toggle("active", catId === activeCategory);
  });
}

// ============================================================================
// EVENT BINDINGS
// ============================================================================

function bindEvents() {
  $("mode").onchange = () => {
    renderMenu();
    renderOrder();
  };

  $("gen").onclick = genReceipt;

  $("clear").onclick = clearOrder;

  $("printBtn").onclick = () => {
    if (!$("receipt").innerHTML.trim()) genReceipt();
    window.print();
  };

  // Tip percentage buttons
  document.querySelectorAll(".tip-btn").forEach((btn) => {
    btn.onclick = () => setTipByPercent(parseInt(btn.dataset.pct, 10));
  });

  // Custom tip input
  $("tipInput").addEventListener("input", () => {
    const val = parseFloat($("tipInput").value);
    setTipByAmount(isNaN(val) ? 0 : val);
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  bindEvents();
  
  // Load menu from CSV
  fetch('menu.csv')
    .then(res => res.text())
    .then(text => {
      menuData = parseCSV(text);
      renderMenu();
      renderOrder();
    })
    .catch(err => {
      $('menu').innerHTML = '<div style="color:red">Failed to load menu.csv</div>';
      renderOrder();
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
