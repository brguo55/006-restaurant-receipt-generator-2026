
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
  "Dessert",
  "Salad",
  "Soup",
  "Pork",
  "Beef",
  "Chicken",
  "Seafood",
  "Duck",
  "Tofu and Vegetable",
  "Moo Shu",
  "Egg Foo Young",
  "Gluten-Free Steamed Dishes",
  "Kid's Meal",
  "Combination",
  "House Specialty",
  "Fried Rice & Lo Mein",
  "Chinese Cuisine",
  "Hot Pot",
  "Noodle",
  "Hunam Special Combo",
  "Side Order",
  "Beverage",
  "Others",
  "Add-On",
];

const FRIED_RICE_LO_MEIN_CATEGORY = "Fried Rice & Lo Mein";
const FRIED_RICE_LO_MEIN_TITLE = "Fried Rice & Lo Mein";
const MOO_SHU_CATEGORY = "Moo Shu";
const EGG_FOO_YOUNG_CATEGORY = "Egg Foo Young";
const NOODLE_CATEGORY = "Noodle";
const BEVERAGE_CATEGORY = "Beverage";
const ADD_ON_CATEGORY = "Add-On";
const HUNAM_SPECIAL_COMBO_CATEGORY = "Hunam Special Combo";
const OTHERS_CATEGORY = "Others";
const SIDE_SELECTION_CATEGORIES = new Set([
  "Pork",
  "Beef",
  "Chicken",
  "Seafood",
  "Duck",
  "Tofu and Vegetable",
  EGG_FOO_YOUNG_CATEGORY,
  "Gluten-Free Steamed Dishes",
  "Kid's Meal",
  "Combination",
  "House Specialty",
  "Chinese Cuisine",
  "Hot Pot",
]);
const OTHERS_SEASONAL_VEGETABLES = [
  "Stir-Fried Snow Pea Leaves",
  "Stir-Fried Baby Broccoli",
  "Stir-Fried Bok Choy",
];
const OTHERS_GLOBAL_SIDE_CODES = new Set(["X1a", "X1b", "X1c", "X4", "X5"]);
const HUNAM_COMBO_NO_RICE_BASE_CODES = new Set(["U26", "U29"]);
const NO_SIDE_OPTION = { key: "no-side", en: "No Side", zh: "无", surcharge: 0 };
const REGULAR_SIDE_OPTIONS = [
  { key: "white-rice", en: "White Rice", zh: "白饭", surcharge: 0 },
  { key: "fried-rice", en: "Fried Rice", zh: "炒饭", surcharge: 0 },
  { key: "brown-rice", en: "Brown Rice", zh: "糙米饭", surcharge: 1 },
  { key: "lo-mein", en: "Lo Mein", zh: "捞面", surcharge: 1 },
  NO_SIDE_OPTION,
];
const HUNAM_COMBO_SIDE_OPTIONS = [
  { key: "egg-roll", en: "Egg Roll", zh: "蛋卷", surcharge: 0 },
  { key: "veggie-roll", en: "Veggie Roll", zh: "素春卷", surcharge: 0 },
  { key: "egg-drop-soup", en: "Egg Drop Soup", zh: "蛋花汤", surcharge: 0 },
  { key: "wonton-soup", en: "Wonton Soup", zh: "馄饨汤", surcharge: 0 },
  { key: "hot-sour-soup", en: "Hot & Sour Soup", zh: "酸辣汤", surcharge: 0 },
  NO_SIDE_OPTION,
];
const HUNAM_COMBO_RICE_OPTIONS = [
  { key: "white-rice", en: "White Rice", zh: "白饭", surcharge: 0 },
  { key: "fried-rice", en: "Fried Rice", zh: "炒饭", surcharge: 0 },
  { key: "brown-rice", en: "Brown Rice", zh: "糙米饭", surcharge: 1 },
  { key: "lo-mein", en: "Lo Mein", zh: "捞面", surcharge: 1 },
  NO_SIDE_OPTION,
];

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
  if (category === ADD_ON_CATEGORY) {
    return 'Signature Food';
  }
  return category;
}

function displayCategoryNavigatorName(category) {
  if (category === ADD_ON_CATEGORY) {
    return ADD_ON_CATEGORY;
  }
  return displayCategoryName(category);
}

function getHunamComboNumber(item) {
  if (item.category !== HUNAM_SPECIAL_COMBO_CATEGORY) return '';

  const match = getBaseCode(item.code).match(/^U(\d+)$/i);
  return match ? match[1] : '';
}

function prefixHunamComboNumber(text, item) {
  const comboNumber = getHunamComboNumber(item);
  return comboNumber ? `${comboNumber}. ${text}` : text;
}

function label(item) {
  const en = item.en;
  const text = $("mode").value === "both" && item.zh ? `${en} / ${item.zh}` : en;
  return prefixHunamComboNumber(text, item);
}

function receiptLabel(item) {
  const en = item.en;
  const text = $("mode").value === "both" && item.zh ? `${en} / ${item.zh}` : en;
  return prefixHunamComboNumber(text, item);
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
  const baseText = $("mode").value === "both"
    ? (() => {
        const zh = getGroupZhLabel(items);
        return zh ? `${en} / ${zh}` : en;
      })()
    : en;

  if (items[0]?.category === HUNAM_SPECIAL_COMBO_CATEGORY) {
    return prefixHunamComboNumber(baseText, items[0]);
  }

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

function getOrderKey(item) {
  const sideSuffix = item.sideSelection ? `::${item.sideSelection.key}` : '';
  const comboSuffix = item.comboSelection
    ? `::${item.comboSelection.side.key}::${item.comboSelection.rice?.key || 'no-rice'}`
    : '';
  return `${item.category}::${item.code}${comboSuffix}${sideSuffix}`;
}

function formatOption(option) {
  const text = $("mode").value === "both" && option.zh ? `${option.en} / ${option.zh}` : option.en;
  return option.surcharge > 0 ? `${text} (+${money(option.surcharge)})` : text;
}

function getItemDetailLines(item) {
  if (item.comboSelection) {
    const lines = [`Soup/Roll: ${formatOption(item.comboSelection.side)}`];
    if (item.comboSelection.rice) {
      lines.push(`Rice/Noodle: ${formatOption(item.comboSelection.rice)}`);
    }
    return lines;
  }

  if (item.sideSelection) {
    return [`Side: ${formatOption(item.sideSelection)}`];
  }

  return [];
}

function getRiceNoodleSummaryCounts() {
  const totals = new Map([
    ["white-rice", { label: "White Rice", qty: 0 }],
    ["fried-rice", { label: "Fried Rice", qty: 0 }],
    ["brown-rice", { label: "Brown Rice", qty: 0 }],
    ["lo-mein", { label: "Lo Mein", qty: 0 }],
  ]);

  order.forEach((entry) => {
    const riceKey = entry.item.comboSelection?.rice?.key;
    const sideKey = entry.item.sideSelection?.key;
    const selectionKey = riceKey || sideKey;

    if (!selectionKey || selectionKey === "no-side" || !totals.has(selectionKey)) {
      return;
    }

    totals.get(selectionKey).qty += entry.qty;
  });

  return [...totals.values()].filter((entry) => entry.qty > 0);
}

function isHunamComboBaseItem(item) {
  return item.category === HUNAM_SPECIAL_COMBO_CATEGORY && !item.comboSelection;
}

function globalAddSideEnabled() {
  return $("addSide")?.value === "yes";
}

function supportsGlobalSideSelection(item) {
  if (item.category === OTHERS_CATEGORY) {
    return OTHERS_GLOBAL_SIDE_CODES.has(item.code);
  }

  return SIDE_SELECTION_CATEGORIES.has(item.category);
}

function requiresSideSelection(item) {
  return globalAddSideEnabled() && supportsGlobalSideSelection(item) && !item.sideSelection && !item.comboSelection;
}

function hunamComboSkipsRice(item) {
  return HUNAM_COMBO_NO_RICE_BASE_CODES.has(getBaseCode(item.code));
}

function createHunamComboConfiguredItem(item, sideOption, riceOption) {
  const surcharge = sideOption.surcharge + (riceOption?.surcharge || 0);
  return {
    ...item,
    basePrice: item.price,
    price: item.price + surcharge,
    comboSelection: {
      side: sideOption,
      rice: riceOption || null,
    },
  };
}

function createSideConfiguredItem(item, sideOption) {
  const basePrice = item.basePrice ?? item.price;
  return {
    ...item,
    basePrice,
    price: basePrice + sideOption.surcharge,
    sideSelection: sideOption,
  };
}

function createAddOnItem(name, price) {
  const trimmedName = name.trim();
  const normalizedName = trimmedName.toLowerCase().replace(/\s+/g, '-');
  return {
    category: ADD_ON_CATEGORY,
    code: `addon-${normalizedName}-${price.toFixed(2)}`,
    en: trimmedName,
    zh: '',
    price,
  };
}

function showPopupOptions(options, buttonEl, onSelectItem = add) {
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
      onSelectItem(item);
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

function showVariantPopup(items, buttonEl, onSelectItem = add) {
  showPopupOptions(
    items.map((item) => ({ item, text: label(item) })),
    buttonEl,
    onSelectItem
  );
}

function closeVariantPopup() {
  const existing = document.getElementById('variantPopup');
  if (existing) existing.remove();
}

function closeHunamComboModal() {
  const existing = document.getElementById('hunamComboModal');
  if (existing) existing.remove();
}

function closeSideSelectionModal() {
  const existing = document.getElementById('sideSelectionModal');
  if (existing) existing.remove();
}

function showSideSelectionModal(item, onConfirm = addResolvedItem) {
  closeSideSelectionModal();

  const overlay = document.createElement('div');
  overlay.className = 'combo-modal-backdrop';
  overlay.id = 'sideSelectionModal';

  const renderOptions = (name, options) => options.map((option) => `
    <label class="combo-choice">
      <input type="radio" name="${name}" value="${option.key}" />
      <span>${formatOption(option)}</span>
    </label>
  `).join('');

  overlay.innerHTML = `
    <div class="combo-modal" role="dialog" aria-modal="true" aria-labelledby="sideSelectionModalTitle">
      <div class="combo-modal-header">
        <h3 id="sideSelectionModalTitle">Choose a Side</h3>
        <button type="button" class="combo-close" aria-label="Close">×</button>
      </div>
      <div class="combo-modal-item">${label(item)}</div>
      <form class="combo-form">
        <div class="combo-group">
          <div class="combo-group-title">Choose one rice/noodle side</div>
          <div class="combo-options">
            ${renderOptions('regularSide', REGULAR_SIDE_OPTIONS)}
          </div>
        </div>
        <div class="small combo-error" aria-live="polite"></div>
        <div class="combo-actions">
          <button type="button" class="secondary combo-cancel">Cancel</button>
          <button type="submit" class="primary combo-submit">Add Item</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => closeSideSelectionModal();
  overlay.querySelector('.combo-close').onclick = close;
  overlay.querySelector('.combo-cancel').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  const form = overlay.querySelector('.combo-form');
  const errorEl = overlay.querySelector('.combo-error');
  form.onsubmit = (e) => {
    e.preventDefault();
    const sideKey = form.elements.regularSide.value;

    if (!sideKey) {
      errorEl.textContent = 'Choose one rice/noodle side option.';
      return;
    }

    const sideOption = REGULAR_SIDE_OPTIONS.find((option) => option.key === sideKey);
    errorEl.textContent = '';
    onConfirm(createSideConfiguredItem(item, sideOption));
    close();
  };

  const firstInput = overlay.querySelector('input[type="radio"]');
  if (firstInput) firstInput.focus();
}

function showHunamComboModal(item) {
  closeHunamComboModal();

  const skipsRice = hunamComboSkipsRice(item);
  const overlay = document.createElement('div');
  overlay.className = 'combo-modal-backdrop';
  overlay.id = 'hunamComboModal';

  const renderOptions = (name, options) => options.map((option) => `
    <label class="combo-choice">
      <input type="radio" name="${name}" value="${option.key}" />
      <span>${formatOption(option)}</span>
    </label>
  `).join('');

  overlay.innerHTML = `
    <div class="combo-modal" role="dialog" aria-modal="true" aria-labelledby="comboModalTitle">
      <div class="combo-modal-header">
        <h3 id="comboModalTitle">Hunam Combo Choices</h3>
        <button type="button" class="combo-close" aria-label="Close">×</button>
      </div>
      <div class="combo-modal-item">${label(item)}</div>
      <form class="combo-form">
        <div class="combo-group">
          <div class="combo-group-title">Choose one side</div>
          <div class="combo-options">
            ${renderOptions('comboSide', HUNAM_COMBO_SIDE_OPTIONS)}
          </div>
        </div>
        <div class="combo-group">
          <div class="combo-group-title">Choose one rice/noodle</div>
          ${skipsRice ? '<div class="combo-note">This combo does not include a rice or noodle choice.</div>' : `<div class="combo-options">${renderOptions('comboRice', HUNAM_COMBO_RICE_OPTIONS)}</div>`}
        </div>
        <div class="small combo-error" aria-live="polite"></div>
        <div class="combo-actions">
          <button type="button" class="secondary combo-cancel">Cancel</button>
          <button type="submit" class="primary combo-submit">Add Combo</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => closeHunamComboModal();
  overlay.querySelector('.combo-close').onclick = close;
  overlay.querySelector('.combo-cancel').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  const form = overlay.querySelector('.combo-form');
  const errorEl = overlay.querySelector('.combo-error');
  form.onsubmit = (e) => {
    e.preventDefault();
    const sideKey = form.elements.comboSide.value;
    const riceKey = skipsRice ? null : form.elements.comboRice.value;

    if (!sideKey) {
      errorEl.textContent = 'Choose one side.';
      return;
    }

    if (!skipsRice && !riceKey) {
      errorEl.textContent = 'Choose one rice or noodle option.';
      return;
    }

    const sideOption = HUNAM_COMBO_SIDE_OPTIONS.find((option) => option.key === sideKey);
    const riceOption = skipsRice ? null : HUNAM_COMBO_RICE_OPTIONS.find((option) => option.key === riceKey);
    errorEl.textContent = '';
    addResolvedItem(createHunamComboConfiguredItem(item, sideOption, riceOption));
    close();
  };

  const firstInput = overlay.querySelector('input[type="radio"]');
  if (firstInput) firstInput.focus();
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

function getMooShuOptions(items) {
  return items.map((item) => {
    const enText = item.en.replace(/^Moo Shu with\s+/i, "");
    const zhText = item.zh.startsWith("木须") ? item.zh.slice(2) : item.zh;

    return {
      item,
      text: $("mode").value === "both" && zhText ? `${enText} / ${zhText}` : enText,
    };
  });
}

function renderMooShuSection(grid, items) {
  const options = getMooShuOptions(items);
  if (!options.length) return;

  const priceInfo = getGroupPrice(options.map((option) => option.item));
  const el = document.createElement("div");
  el.className = "item";
  el.style.position = "relative";
  el.innerHTML = `
    <div class="row">
      <div class="name">${MOO_SHU_CATEGORY}</div>
      <div class="price">${priceInfo.same ? money(priceInfo.min) : `from ${money(priceInfo.min)}`}</div>
    </div>
    <button class="add">Add</button>
  `;
  el.querySelector("button").onclick = (e) => {
    e.stopPropagation();
    showPopupOptions(options, e.target);
  };
  grid.appendChild(el);
}

function getEggFooYoungOptions(items) {
  return items.map((item) => {
    const enText = item.en.replace(/\s+Egg Foo Young$/i, "");
    const zhText = item.zh.endsWith("芙蓉蛋") ? item.zh.slice(0, -3) : item.zh;

    return {
      item,
      text: $("mode").value === "both" && zhText ? `${enText} / ${zhText}` : enText,
    };
  });
}

function renderEggFooYoungSection(grid, items) {
  const options = getEggFooYoungOptions(items);
  if (!options.length) return;

  const priceInfo = getGroupPrice(options.map((option) => option.item));
  const el = document.createElement("div");
  el.className = "item";
  el.style.position = "relative";
  el.innerHTML = `
    <div class="row">
      <div class="name">${EGG_FOO_YOUNG_CATEGORY}</div>
      <div class="price">${priceInfo.same ? money(priceInfo.min) : `from ${money(priceInfo.min)}`}</div>
    </div>
    <button class="add">Add</button>
  `;
  el.querySelector("button").onclick = (e) => {
    e.stopPropagation();
    showPopupOptions(options, e.target);
  };
  grid.appendChild(el);
}

function getNoodleSections(items) {
  const itemByCode = new Map(items.map((item) => [item.code, item]));

  const makeOption = (text, zh, code) => {
    const item = itemByCode.get(code);
    if (!item) return null;
    return {
      item,
      text: $("mode").value === "both" ? `${text} / ${zh}` : text,
    };
  };

  const makeSingle = (title, code) => {
    const item = itemByCode.get(code);
    if (!item) return null;
    return { title, item };
  };

  return [
    {
      title: "Soup Noodle",
      options: [
        makeOption("Chicken", "鸡", "T1a"),
        makeOption("Vegetable", "菜", "T1b"),
      ].filter(Boolean),
    },
    makeSingle("Beef Stew Soup Noodle", "T2"),
    makeSingle("Singapore Rice Noodle", "T3"),
    {
      title: "Chow Fun",
      options: [
        makeOption("Beef", "牛", "T4a"),
        makeOption("Chicken", "鸡", "T4b"),
        makeOption("Pork", "猪", "T4c"),
        makeOption("Vegetable", "菜", "T4d"),
      ].filter(Boolean),
    },
    {
      title: "Cantonese Style Chow Mein",
      options: [
        makeOption("Chicken", "鸡", "T5a"),
        makeOption("Roast Pork", "叉烧", "T5b"),
        makeOption("Seafood", "海鲜", "T5c"),
        makeOption("Shrimp", "虾", "T5d"),
        makeOption("Vegetable", "菜", "T5e"),
      ].filter(Boolean),
    },
  ].filter((section) => section && (section.item || section.options?.length));
}

function renderNoodleSection(grid, items) {
  const sections = getNoodleSections(items);

  sections.forEach((section) => {
    const el = document.createElement("div");
    el.className = "item";

    if (section.item) {
      el.innerHTML = `
        <div class="row">
          <div class="name">${section.title}</div>
          <div class="price">${money(section.item.price)}</div>
        </div>
        <button class="add">Add</button>
      `;
      el.querySelector("button").onclick = () => add(section.item);
      grid.appendChild(el);
      return;
    }

    const priceInfo = getGroupPrice(section.options.map((option) => option.item));
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

function getBeverageSections(items) {
  const itemByCode = new Map(items.map((item) => [item.code, item]));

  const makeOption = (text, zh, code) => {
    const item = itemByCode.get(code);
    if (!item) return null;
    return {
      item,
      text: $("mode").value === "both" ? `${text} / ${zh}` : text,
    };
  };

  const makeSingle = (title, code) => {
    const item = itemByCode.get(code);
    if (!item) return null;
    return { title, item };
  };

  return [
    makeSingle("Hot Tea", "W1"),
    {
      title: "Ice Tea",
      options: [
        makeOption("Unsweet", "无糖", "W2b"),
        makeOption("Sweet", "甜", "W2a"),
      ].filter(Boolean),
    },
    {
      title: "Soft Drink",
      options: [
        makeOption("Coke", "可乐", "W3a"),
        makeOption("Diet Coke", "健怡可乐", "W3b"),
        makeOption("Dr. Pepper", "胡椒博士", "W3c"),
        makeOption("Sprite", "雪碧", "W3d"),
      ].filter(Boolean),
    },
    makeSingle("Apple Juice", "W4"),
    makeSingle("Orange Juice", "W5"),
    makeSingle("Wong Lo Kat", "W6"),
  ].filter((section) => section && (section.item || section.options?.length));
}

function renderBeverageSection(grid, items) {
  const sections = getBeverageSections(items);

  sections.forEach((section) => {
    const el = document.createElement("div");
    el.className = "item";

    if (section.item) {
      el.innerHTML = `
        <div class="row">
          <div class="name">${section.title}</div>
          <div class="price">${money(section.item.price)}</div>
        </div>
        <button class="add">Add</button>
      `;
      el.querySelector("button").onclick = () => add(section.item);
      grid.appendChild(el);
      return;
    }

    const priceInfo = getGroupPrice(section.options.map((option) => option.item));
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

function submitAddOnForm(form) {
  const nameInput = form.elements.addOnName;
  const priceInput = form.elements.addOnPrice;
  const addSideInput = form.elements.addOnAddSide;
  const errorEl = form.querySelector('.addon-error');
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);

  if (!name) {
    errorEl.textContent = 'Enter a signature food name.';
    nameInput.focus();
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    errorEl.textContent = 'Enter a valid price of 0 or more.';
    priceInput.focus();
    return;
  }

  errorEl.textContent = '';
  const item = createAddOnItem(name, price);

  if (addSideInput.checked) {
    showSideSelectionModal(item, (configuredItem) => {
      addResolvedItem(configuredItem);
      form.reset();
      nameInput.focus();
    });
    return;
  }

  addResolvedItem(item);
  form.reset();
  nameInput.focus();
}

function renderAddOnSection(grid) {
  const form = document.createElement('form');
  form.className = 'item addon-item';
  form.innerHTML = `
    <div class="addon-fields">
      <div class="addon-field addon-name-field">
        <label>Signature Food</label>
        <input name="addOnName" type="text" placeholder="Signature Food Name" autocomplete="off" />
      </div>
      <div class="addon-field addon-price-field">
        <label>Price</label>
        <input name="addOnPrice" type="number" min="0" step="0.01" placeholder="0.00" inputmode="decimal" />
      </div>
    </div>
    <label class="side-toggle addon-side-toggle">
      <input name="addOnAddSide" type="checkbox" />
      <span>Add Side</span>
    </label>
    <button class="add" type="submit">Add to Order</button>
    <div class="small addon-error" aria-live="polite"></div>
  `;
  form.onsubmit = (e) => {
    e.preventDefault();
    submitAddOnForm(form);
  };
  grid.appendChild(form);
}

function getOthersSections(items) {
  const itemByName = new Map(items.map((item) => [item.en, item]));

  const makeOption = (name) => {
    const item = itemByName.get(name);
    if (!item) return null;
    return {
      item,
      text: label(item),
    };
  };

  return [
    {
      title: "Seasonal Vegetables",
      options: OTHERS_SEASONAL_VEGETABLES.map(makeOption).filter(Boolean),
    },
  ].filter((section) => section.options.length > 0);
}

function renderOthersSection(grid, items) {
  const sections = getOthersSections(items);
  const sectionCodes = new Set();

  sections.forEach((section) => {
    section.options.forEach((option) => sectionCodes.add(option.item.code));

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
      showPopupOptions(section.options, e.target, add);
    };
    grid.appendChild(el);
  });

  items
    .filter((item) => !sectionCodes.has(item.code))
    .forEach((item) => {
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
  const who = $("who").value.trim();
  const riceNoodleSummary = getRiceNoodleSummaryCounts();

  parts.push(`<div class="rc-slip">`);
  parts.push(`<div class="rc-center rc-brand">Hunam Chinese Restaurant</div>`);
  parts.push(`<div class="rc-center rc-brand-sub">南苑餐厅</div>`);
  parts.push(`<div class="rc-center rc-small">790 Martin Luther King Jr Blvd</div>`);
  parts.push(`<div class="rc-center rc-small">Chapel Hill, NC 27514</div>`);
  parts.push(`<div class="rc-center rc-small">(919) 967-6133</div>`);
  parts.push(`<div class="rc-divider"></div>`);
  parts.push(`<div class="rc-meta">`);
  parts.push(`<div class="rc-meta-line">Order: ${$("type").value}</div>`);
  if (who) {
    parts.push(`<div class="rc-meta-line">Ref: ${who}</div>`);
  }
  parts.push(`<div class="rc-meta-line">${new Date().toLocaleString()}</div>`);
  parts.push(`</div>`);
  parts.push(`<div class="rc-divider"></div>`);

  order.forEach((v) => {
    const detailLines = getItemDetailLines(v.item)
      .map((line) => `<div class="rc-entry-option">${line}</div>`)
      .join('');
    parts.push(`
      <div class="rc-entry">
        <div class="rc-entry-name">${receiptLabel(v.item)}</div>
        ${detailLines}
        <div class="rc-entry-meta">
          <span>${v.qty} x ${money(v.item.price)}</span>
          <span>${money(v.qty * v.item.price)}</span>
        </div>
      </div>
    `);
  });

  parts.push(`<div class="rc-divider"></div>`);
  parts.push(`<div class="rc-summary">`);
  parts.push(`<div class="rc-summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>`);
  parts.push(`<div class="rc-summary-row"><span>Tax (7.5%)</span><span>${money(tax)}</span></div>`);
  parts.push(`<div class="rc-summary-row"><span>Tip</span><span>${money(tip)}</span></div>`);
  parts.push(`<div class="rc-summary-row rc-total"><span>Total</span><span>${money(total)}</span></div>`);
  parts.push(`</div>`);

  if ($("note").value.trim()) {
    parts.push(`<div class="rc-divider"></div>`);
    parts.push(`<div class="rc-note"><strong>NOTE:</strong> ${$("note").value.trim()}</div>`);
  }

  if (riceNoodleSummary.length) {
    const summaryText = riceNoodleSummary
      .map((entry) => `${entry.label} x${entry.qty}`)
      .join(', ');
    parts.push(`<div class="rc-divider"></div>`);
    parts.push(`<div class="rc-side-summary">Rice / Noodle Summary: ${summaryText}</div>`);
  }

  parts.push(`<div class="rc-divider"></div>`);
  parts.push(`<div class="rc-center rc-thank">Thank you!</div>`);
  parts.push(`<div class="rc-center rc-small">欢迎再次光临</div>`);
  parts.push(`<div class="rc-center rc-small">hunamrestaurant.net</div>`);
  parts.push(`<div class="rc-center rc-small">Serving North Carolina since 1980</div>`);
  parts.push(`</div>`);

  $("receipt").innerHTML = parts.join("");
}

// ============================================================================
// CART OPERATIONS
// ============================================================================

function addResolvedItem(item) {
  const key = getOrderKey(item);
  const v = order.get(key) || { item, qty: 0 };
  v.qty++;
  order.set(key, v);
  renderOrder();
}

function add(item) {
  if (isHunamComboBaseItem(item)) {
    showHunamComboModal(item);
    return;
  }

  if (requiresSideSelection(item)) {
    showSideSelectionModal(item);
    return;
  }

  addResolvedItem(item);
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
  closeHunamComboModal();
  closeSideSelectionModal();
  renderOrder();
  $("receipt").innerHTML = "";
}

// ============================================================================
// MENU RENDERING
// ============================================================================

function renderMenu() {
  const root = $("menu");
  root.innerHTML = "";
  closeHunamComboModal();
  closeSideSelectionModal();

  categoryOrder.forEach((cat) => {
    const items = menuData.filter((x) => x.category === cat);
    if (!items.length && cat !== ADD_ON_CATEGORY) return;

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

    if (cat === MOO_SHU_CATEGORY) {
      renderMooShuSection(grid, items);
      root.appendChild(sec);
      return;
    }

    if (cat === EGG_FOO_YOUNG_CATEGORY) {
      renderEggFooYoungSection(grid, items);
      root.appendChild(sec);
      return;
    }

    if (cat === NOODLE_CATEGORY) {
      renderNoodleSection(grid, items);
      root.appendChild(sec);
      return;
    }

    if (cat === BEVERAGE_CATEGORY) {
      renderBeverageSection(grid, items);
      root.appendChild(sec);
      return;
    }

    if (cat === ADD_ON_CATEGORY) {
      renderAddOnSection(grid);
      root.appendChild(sec);
      return;
    }

    if (cat === OTHERS_CATEGORY) {
      renderOthersSection(grid, items);
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

  order.forEach((v, key) => {
    const detailLines = getItemDetailLines(v.item)
      .map((line) => `<div class="small line-detail">${line}</div>`)
      .join('');
    const el = document.createElement("div");
    el.className = "line";
    el.innerHTML = `
      <div>
        <div style="font-weight:900">${label(v.item)}</div>
        ${detailLines}
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
    cat === ADD_ON_CATEGORY || menuData.some(item => item.category === cat)
  );

  availableCategories.forEach(cat => {
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = displayCategoryNavigatorName(cat);
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
    element.scrollIntoView({ behavior: "smooth", block: "center" });
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

function bindMinZeroValidationMessages() {
  document.addEventListener('invalid', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== 'number' || input.min !== '0') return;

    input.setCustomValidity(
      input.validity.rangeUnderflow ? 'Value must be greater than or equal to 0!' : ''
    );
  }, true);

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== 'number' || input.min !== '0') return;

    input.setCustomValidity('');
  }, true);
}

// ============================================================================
// EVENT BINDINGS
// ============================================================================

function bindEvents() {
  bindMinZeroValidationMessages();

  $("mode").onchange = () => {
    renderMenu();
    renderOrder();
  };

  $("addSide").onchange = () => {
    renderMenu();
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
