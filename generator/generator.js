
let menuData = [];



const categoryOrder = [
  "Appetizers",
  "Salads",
  "Soups",
  "Beef",
  "Pork",
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

const order = new Map();
const $ = (id) => document.getElementById(id);
const money = (n) => `$${n.toFixed(2)}`;

function label(item) {
  const en = item.code ? `${item.code} ${item.en}` : item.en;
  return $("mode").value === "both" && item.zh ? `${en} / ${item.zh}` : en;
}

function renderMenu() {
  const root = $("menu");
  root.innerHTML = "";
  categoryOrder.forEach((cat) => {
    const items = menuData.filter((x) => x.category === cat);
    if (!items.length) return;
    const sec = document.createElement("div");
    sec.className = "cat";
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
}

function add(item) {
  const key = item.code;
  const v = order.get(key) || { item, qty: 0 };
  v.qty++;
  order.set(key, v);
  renderOrder();
}

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
    btns[0].onclick = () => {
      v.qty--;
      if (v.qty <= 0) order.delete(key);
      renderOrder();
    };
    btns[1].onclick = () => {
      v.qty++;
      renderOrder();
    };
    btns[2].onclick = () => {
      order.delete(key);
      renderOrder();
    };
    root.appendChild(el);
  });
  $("subtotal").textContent = money(subtotal);
  $("total").textContent = money(subtotal);
}

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

$("mode").onchange = () => {
  renderMenu();
  renderOrder();
};
$("gen").onclick = genReceipt;
$("clear").onclick = () => {
  order.clear();
  renderOrder();
  $("receipt").textContent = "";
};
$("printBtn").onclick = () => {
  if (!$("receipt").textContent.trim()) genReceipt();
  window.print();
};


// Simple CSV parser
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

// Load menuData from CSV then render
fetch('menu.csv')
  .then(res => res.text())
  .then(text => {
    menuData = parseCSV(text);
    renderMenu();
    renderOrder();
  })
  .catch(err => {
    document.getElementById('menu').innerHTML = '<div style="color:red">Failed to load menu.csv</div>';
    renderOrder();
  });
