
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
  "Appetizer",
  "Salad",
  "Soup",
  "Pork",
  "Beef",
  "Chicken",
  "Duck",
  "Seafood",
  "Moo Shu",
  "Side Order",
  "Tofu and Vegetable",
  "House Specialty",
  "Gluten-Free Steamed Dishes",
  "Fried Rice or Lo Mein",
  "Egg Foo Young",
  "Noodle",
  "Kid's Menu",
  "Combination",
  "Traditional Chinese Cuisine",
  "Hot Pot",
  "Dessert",
  "Beverage",
  "Hunan Special Meal Combo",
];

const FRIED_RICE_LO_MEIN_CATEGORY = "Fried Rice or Lo Mein";
const FRIED_RICE_LO_MEIN_TITLE = "Fried Rice & Lo Mein";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function money(n) {
  return `$${n.toFixed(2)}`;
}

function displayCategoryName(category) {
  if (category === FRIED_RICE_LO_MEIN_CATEGORY) {
    return FRIED_RICE_LO_MEIN_TITLE;
  }
  return category;
}

function label(item) {
  const en = item.en;
  return $("mode").value === "both" && item.zh ? `${en} / ${item.zh}` : en;
}

function receiptLabel(item) {
  const en = item.en;
  return $("mode").value === "both" && item.zh ? `${en} / ${item.zh}` : en;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = h === 'price' ? parseFloat(values[i]) : values[i] ?? '';
    });
    return obj;
  });
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  values.push(current.trim());
  return values;
}

// ============================================================================
// ITEM GROUPING (e.g. Fried/Steamed Dumplings → "Dumplings")
// ============================================================================

function getBaseCode(code) {
  return code.replace(/[a-z]+$/, '');
}

function groupItems(items) {
  const groups = new Map();
  items.forEach(item => {
    const base = getBaseCode(item.code);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(item);
  });
  return [...groups.values()];
}

function getGroupEnLabel(items) {
  const wordSets = items.map(i => new Set(i.en.split(' ')));
  const commonWords = [...wordSets[0]].filter(w => wordSets.every(s => s.has(w)));
  const ordered = items[0].en.split(' ').filter(w => commonWords.includes(w));
  const trailingJoiners = new Set(['with', 'or', '&']);
  const leadingJoiners = new Set(['with', 'or', '&']);

  while (ordered.length && leadingJoiners.has(ordered[0].toLowerCase())) {
    ordered.shift();
  }

  while (ordered.length && trailingJoiners.has(ordered[ordered.length - 1].toLowerCase())) {
    ordered.pop();
  }

  return ordered.join(' ') || items[0].en;
}

function getGroupZhLabel(items) {
  const zhs = items.map(i => i.zh).filter(Boolean);
  if (!zhs.length) return '';
  let common = '';
  const minLen = Math.min(...zhs.map(z => z.length));
  for (let i = 1; i <= minLen; i++) {
    const ch = zhs[0][zhs[0].length - i];
    if (zhs.every(z => z[z.length - i] === ch)) {
      common = ch + common;
    } else break;
  }
  return common || zhs[0];
}

function groupLabel(items) {
  const en = getGroupEnLabel(items);
  if ($("mode").value === "both") {
    const zh = getGroupZhLabel(items);
    return zh ? `${en} / ${zh}` : en;
  }
  return en;
}

function getGroupPrice(items) {
  const prices = items.map(i => i.price).filter(p => p > 0);
  if (!prices.length) return { min: 0, max: 0, same: true };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, same: min === max };
}

function showPopupOptions(options, buttonEl) {
  closeVariantPopup();
  const popup = document.createElement('div');
  popup.className = 'variant-popup';
  popup.id = 'variantPopup';

  options.forEach(({ item, text }) => {
    const btn = document.createElement('button');
    btn.className = 'variant-option';
    btn.innerHTML = `<span>${text}</span><span>${money(item.price)}</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      add(item);
      closeVariantPopup();
    };
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);
  const rect = buttonEl.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.width = rect.width + 'px';
  popup.style.bottom = (window.innerHeight - rect.top + 4) + 'px';

  setTimeout(() => {
    document.addEventListener('click', closeVariantPopup, { once: true });
  }, 0);
}

function showVariantPopup(items, buttonEl) {
  showPopupOptions(
    items.map((item) => ({ item, text: label(item) })),
    buttonEl
  );
}

function closeVariantPopup() {
  const existing = document.getElementById('variantPopup');
  if (existing) existing.remove();
}

function getFriedRiceLoMeinSections(items) {
  const itemByName = new Map(items.map((item) => [item.en, item]));

  const makeOption = (text, zh, itemName) => {
    const item = itemByName.get(itemName);
    if (!item) return null;
    return {
      item,
      text: $("mode").value === "both" ? `${text} / ${zh}` : text,
    };
  };

  return [
    {
      title: "Fried Rice",
      options: [
        makeOption("Vegetable", "菜", "Vegetable Fried Rice"),
        makeOption("Chicken", "鸡", "Chicken Fried Rice"),
        makeOption("Pork", "猪", "Roast Pork Fried Rice"),
        makeOption("Shrimp", "虾", "Shrimp Fried Rice"),
        makeOption("Beef", "牛", "Beef Fried Rice"),
        makeOption("House Special", "招牌", "House Special Fried Rice"),
      ].filter(Boolean),
    },
    {
      title: "Lo Mein",
      options: [
        makeOption("Vegetable", "菜", "Vegetable Lo Mein"),
        makeOption("Chicken", "鸡", "Chicken Lo Mein"),
        makeOption("Pork", "猪", "Roast Pork Lo Mein"),
        makeOption("Shrimp", "虾", "Shrimp Lo Mein"),
        makeOption("Beef", "牛", "Beef Lo Mein"),
        makeOption("House Special", "招牌", "House Special Lo Mein"),
      ].filter(Boolean),
    },
  ].filter((section) => section.options.length > 0);
}

function renderFriedRiceLoMeinSection(grid, items) {
  const sections = getFriedRiceLoMeinSections(items);

  sections.forEach((section) => {
    const priceInfo = getGroupPrice(section.options.map((option) => option.item));
    const el = document.createElement("div");
    el.className = "item";
    el.style.position = "relative";
    el.innerHTML = `
      <div class="row">
        <div class="name">${section.title}</div>
        <div class="price">${priceInfo.same ? money(priceInfo.min) : `from ${money(priceInfo.min)}`}</div>
      </div>
      <button class="add">Add</button>
    `;
    el.querySelector("button").onclick = (e) => {
      e.stopPropagation();
      showPopupOptions(section.options, e.target);
    };
    grid.appendChild(el);
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
  parts.push(`<div class="rc-center rc-small">Tel: (919) 967-6133 | Fax: (919) 967-6723</div>`);
  parts.push(`<div class="rc-divider"></div>`);

  const meta = `${$("type").value}${$("who").value ? " | " + $("who").value : ""}`;
  parts.push(`<div class="rc-center rc-small">${meta}</div>`);
  parts.push(`<div class="rc-center rc-small">${new Date().toLocaleString()}</div>`);
  parts.push(`<div class="rc-divider"></div>`);

  let itemNum = 0;
  order.forEach((v) => {
    itemNum++;
    parts.push(`<div class="rc-item"><span>${String(itemNum).padStart(2, '0')} ${receiptLabel(v.item)} x${v.qty}</span><span>${money(v.qty * v.item.price)}</span></div>`);
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
  parts.push(`<div class="rc-center rc-small">https://www.hunamrestaurant.net/</div>`);
  parts.push(`<div class="rc-center rc-small">Proudly serving the Chapel Hill, Carrboro, and UNC communities since 1980.</div>`);

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
    sec.innerHTML = `<h2>${displayCategoryName(cat)}</h2><div class="grid"></div>`;

    const grid = sec.querySelector(".grid");
    if (cat === FRIED_RICE_LO_MEIN_CATEGORY) {
      renderFriedRiceLoMeinSection(grid, items);
      root.appendChild(sec);
      return;
    }

    const grouped = groupItems(items);
    grouped.forEach((group) => {
      if (group.length === 1) {
        const item = group[0];
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
      } else {
        const priceInfo = getGroupPrice(group);
        const el = document.createElement("div");
        el.className = "item";
        el.style.position = "relative";
        el.innerHTML = `
          <div class="row">
            <div class="name">${groupLabel(group)}</div>
            <div class="price">${priceInfo.same ? money(priceInfo.min) : `from ${money(priceInfo.min)}`}</div>
          </div>
          <button class="add">Add</button>
        `;
        el.querySelector("button").onclick = (e) => {
          e.stopPropagation();
          showVariantPopup(group, e.target);
        };
        grid.appendChild(el);
      }
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
    link.textContent = displayCategoryName(cat);
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
