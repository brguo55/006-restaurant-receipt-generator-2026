
// ============================================================================
// DOM ELEMENTS
// ============================================================================

const $ = (id) => document.getElementById(id);

// ============================================================================
// STATE & VARIABLES
// ============================================================================

let menuData = [];
const order = new Map();

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

// ============================================================================
// RECEIPT GENERATION
// ============================================================================

function genReceipt() {
  const lines = [];
  lines.push("Hunam Chinese Restaurant");
  lines.push("790 Martin Luther King Jr Blvd, Chapel Hill, NC 27514");
  lines.push("--------------------------------");
  lines.push(
    `${$("type").value}${$("who").value ? " | " + $("who").value : ""}`
  );
  lines.push(new Date().toLocaleString());
  lines.push("--------------------------------");
  order.forEach((v) => {
    lines.push(`${v.qty} x ${label(v.item)}`);
    lines.push(`    ${money(v.qty * v.item.price)}`);
  });
  lines.push("--------------------------------");
  lines.push(`Total: ${$("total").textContent}`);
  if ($("note").value.trim()) {
    lines.push("--------------------------------");
    lines.push("NOTE:");
    lines.push($("note").value.trim());
  }
  lines.push("--------------------------------");
  lines.push("Thank you!");
  $("receipt").textContent = lines.join("\n");
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
  renderOrder();
  $("receipt").textContent = "";
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
    subtotal += v.item.price * v.qty;
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

  $("subtotal").textContent = money(subtotal);
  $("total").textContent = money(subtotal);
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
    if (!$("receipt").textContent.trim()) genReceipt();
    window.print();
  };
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
