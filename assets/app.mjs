import { seedBooks, seedOrders, suppliers, sampleCsv } from "./data.mjs";
import {
  SHIPPING,
  allocateStock,
  availability,
  cartTotals,
  estimatedDate,
  filterBooks,
  findBookByIsbn,
  formatMoney,
  getLeadDays,
  getSupplier,
  importCatalog,
  isValidIsbn13,
  normaliseIsbn,
  routeLabel,
  routeOrder,
  routeSummary,
} from "./engine.mjs";

const state = {
  books: seedBooks.map((book) => ({ ...book, cover: { ...book.cover } })),  cart: [],
  orders: seedOrders.map((order) => ({ ...order, lines: order.lines.map((line) => ({ ...line })) })),
  filters: { query: "", category: "All", sort: "curated", staffOnly: false },
  shipping: "pickup",
  routeFilter: "all",
  orderSeq: 1043,
  view: "shop",
  nav: "shop",
  lastOrder: null,
};

const els = {
  shopView: document.querySelector("#shopView"),
  opsView: document.querySelector("#opsView"),
  bookGrid: document.querySelector("#bookGrid"),
  bookCount: document.querySelector("#bookCount"),
  emptyState: document.querySelector("#emptyState"),
  clearFilters: document.querySelector("#clearFilters"),
  categoryChips: document.querySelector("#categoryChips"),
  bookSearch: document.querySelector("#bookSearch"),
  sortSelect: document.querySelector("#sortSelect"),
  heroStats: document.querySelector("#heroStats"),
  featuredBook: document.querySelector("#featuredBook"),
  stockStamp: document.querySelector("#stockStamp"),
  bagCount: document.querySelector("#bagCount"),
  cartDrawer: document.querySelector("#cartDrawer"),
  cartBody: document.querySelector("#cartBody"),
  overlay: document.querySelector("#overlay"),
  bookDialog: document.querySelector("#bookDialog"),
  bookDialogBody: document.querySelector("#bookDialogBody"),
  confirmDialog: document.querySelector("#confirmDialog"),
  confirmBody: document.querySelector("#confirmBody"),
  scanForm: document.querySelector("#scanForm"),
  scanInput: document.querySelector("#scanInput"),
  scanResult: document.querySelector("#scanResult"),
  csvInput: document.querySelector("#csvInput"),
  importHint: document.querySelector("#importHint"),
  importResult: document.querySelector("#importResult"),
  importButton: document.querySelector("#importButton"),
  inventoryRows: document.querySelector("#inventoryRows"),
  inventoryMeta: document.querySelector("#inventoryMeta"),
  orderRows: document.querySelector("#orderRows"),
  orderMeta: document.querySelector("#orderMeta"),
  opsKpis: document.querySelector("#opsKpis"),
  routeFilters: document.querySelector("#routeFilters"),
  toast: document.querySelector("#toast"),
};

let toastTimer = null;

init();

function init() {
  els.csvInput.value = sampleCsv;
  updateImportHint();

  els.bookSearch.addEventListener("input", () => {
    state.filters.query = els.bookSearch.value;
    state.filters.staffOnly = false;
    setNav("shop");
    renderBooks();
  });

  els.sortSelect.addEventListener("change", () => {
    state.filters.sort = els.sortSelect.value;
    renderBooks();
  });

  els.scanForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleScan();
  });

  els.importButton.addEventListener("click", handleImport);

  document.querySelector("#openCart").addEventListener("click", openCart);
  els.overlay.addEventListener("click", closeCart);

  els.csvInput.addEventListener("input", () => {
    updateImportHint();
    els.importResult.classList.remove("is-visible", "has-errors");
  });

  els.cartBody.addEventListener("change", (event) => {
    if (event.target.name !== "shipping") return;
    state.shipping = event.target.value;
    renderCart();
  });

  document.addEventListener("click", handleDocumentClick);

  for (const dialog of [els.bookDialog, els.confirmDialog]) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  els.cartDrawer.addEventListener("transitionend", () => {
    if (!els.cartDrawer.classList.contains("is-open")) {
      els.cartDrawer.setAttribute("aria-hidden", "true");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.cartDrawer.classList.contains("is-open")) {
      closeCart();
    }
  });

  renderAll();
}

function handleDocumentClick(event) {
  const navButton = event.target.closest("[data-nav]");
  if (navButton) {
    const target = navButton.dataset.nav;
    if (target === "ops") {
      goOps();
    } else if (target === "staff") {
      showStaffPicks();
    } else {
      goShop();
    }
    return;
  }

  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    state.filters.category = categoryButton.dataset.category;
    state.filters.staffOnly = false;
    setNav("shop");
    renderBooks();
    return;
  }

  const routeButton = event.target.closest("[data-route-filter]");
  if (routeButton) {
    state.routeFilter = routeButton.dataset.routeFilter;
    renderOrders();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const action = actionButton.dataset.action;
  const bookId = actionButton.dataset.bookId;

  switch (action) {
    case "browse":
      document.querySelector("#shelfSection").scrollIntoView({ behavior: "smooth", block: "start" });
      break;
    case "scan":
      goOps();
      setTimeout(() => els.scanInput.focus(), 120);
      break;
    case "go-shop":
    case "back-shop":
      event.preventDefault();
      goShop();
      break;
    case "go-ops":
      goOps();
      break;
    case "focus-search":
      document.querySelector("#shelfSection").scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => els.bookSearch.focus(), 220);
      break;
    case "clear-filters":
      clearFilters();
      break;
    case "open-book":
      openBook(bookId);
      break;
    case "add-book":
      addToCart(bookId);
      if (actionButton.closest("#bookDialog")) {
        els.bookDialog.close();
        openCart();
      }
      break;
    case "qty":
      changeQuantity(bookId, Number(actionButton.dataset.delta));
      break;
    case "remove-line":
      removeLine(bookId);
      break;
    case "close-cart":
      closeCart();
      break;
    case "checkout":
      placeOrder();
      break;
    case "close-dialog":
      actionButton.closest("dialog")?.close();
      break;
    case "confirm-router":
      els.confirmDialog.close();
      state.routeFilter = "all";
      goOps();
      setTimeout(() => {
        document.querySelector(".router-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      break;
    case "sample-scan":
      els.scanInput.value = "9780141441146";
      handleScan();
      break;
    case "reset-sample":
      els.csvInput.value = sampleCsv;
      els.importResult.classList.remove("is-visible", "has-errors");
      updateImportHint();
      toast("Sample supplier file restored.");
      break;
    case "prefill-import":
      prefillImport(actionButton.dataset.isbn);
      break;
    default:
      break;
  }
}

function renderAll() {
  renderHero();
  renderCategories();
  renderBooks();
  renderCart();
  renderBagCount();
  renderOps();
}

function renderHero() {
  const book = state.books.find((candidate) => candidate.id === "great-gatsby") ?? state.books[0];
  if (book) {
    els.featuredBook.innerHTML = `
      <button class="cover-button" type="button" data-action="open-book" data-book-id="${escapeAttr(book.id)}" aria-label="View ${escapeAttr(book.title)}">
        ${coverHtml(book)}
      </button>
      <div class="featured-caption">
        <h2>${escapeHtml(book.title)}</h2>
        <p>${escapeHtml(book.author)} · ${formatMoney(book.price)}</p>
      </div>`;
    els.stockStamp.innerHTML = `<strong>${book.stock}</strong><span>copies on<br>the shelf</span>`;
  }

  const units = state.books.reduce((sum, item) => sum + Math.max(0, Number(item.stock) || 0), 0);
  const supplierCount = new Set(state.books.map((item) => item.supplier)).size;
  els.heroStats.innerHTML = [
    statHtml(state.books.length, "titles on the floor"),
    statHtml(units, "copies on hand"),
    statHtml(supplierCount, "supplier routes"),
  ].join("");
}

function statHtml(value, label) {
  return `<div class="hero-stat"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`;
}

function renderCategories() {
  const categories = ["All", ...new Set(state.books.map((book) => book.category).sort())];
  els.categoryChips.innerHTML = categories
    .map(
      (category) => `
      <button class="chip ${state.filters.category === category ? "is-active" : ""}" type="button" data-category="${escapeAttr(category)}">
        ${escapeHtml(category)}
      </button>`,
    )
    .join("");
}

function renderBooks() {
  const books = filterBooks(state.books, state.filters);
  els.bookGrid.innerHTML = books.map((book, index) => bookCardHtml(book, index)).join("");
  els.emptyState.hidden = books.length > 0;
  els.bookCount.textContent = `${books.length} ${books.length === 1 ? "title" : "titles"}${state.filters.staffOnly ? " · staff picks" : ""}`;
  els.clearFilters.hidden = !(state.filters.query || state.filters.category !== "All" || state.filters.staffOnly);
}

function bookCardHtml(book, index) {
  const stock = availability(book);
  const flag = stock.key === "supplier" ? `Supplier · ${getLeadDays(book)} days` : stock.detail;
  return `
    <article class="book-card" style="animation-delay:${Math.min(index, 8) * 28}ms">
      <div class="cover-wrap">
        <button class="cover-button" type="button" data-action="open-book" data-book-id="${escapeAttr(book.id)}" aria-label="View ${escapeAttr(book.title)}">
          ${coverHtml(book)}
        </button>
        ${book.staffPick ? '<span class="staff-flag">Staff pick</span>' : ""}
        <span class="cover-flag is-${stock.tone}">${escapeHtml(flag)}</span>
      </div>
      <div class="book-card-body">
        <p class="book-cat">${escapeHtml(book.category)}</p>
        <h3>${escapeHtml(book.title)}</h3>
        <p class="book-author">${escapeHtml(book.author)}</p>
        <div class="book-foot">
          <span class="book-price">${formatMoney(book.price)}</span>
          <button class="add-button" type="button" data-action="add-book" data-book-id="${escapeAttr(book.id)}">
            <svg width="12" height="12" aria-hidden="true"><use href="#i-plus"></use></svg>
            ${book.stock > 0 ? "Add" : "Order in"}
          </button>
        </div>
      </div>
    </article>`;
}

function renderBagCount() {
  const count = state.cart.reduce((sum, line) => sum + line.qty, 0);
  els.bagCount.textContent = count;
  document.querySelector("#openCart").setAttribute("aria-label", count ? `Open shopping bag, ${count} items` : "Open shopping bag");
}

function renderCart() {
  if (state.cart.length === 0) {
    els.cartBody.innerHTML = `
      <div class="cart-empty">
        <svg width="28" height="28" aria-hidden="true"><use href="#i-bag"></use></svg>
        <h3>Your bag is empty.</h3>
        <p>The front table is a good place to start. Every title shows whether it is here or coming from a supplier.</p>
        <button class="button button-primary" type="button" data-action="close-cart">Browse the shelves</button>
      </div>`;
    return;
  }

  const routed = routeOrder(state.cart, state.books);
  const totals = cartTotals(state.cart, state.books, state.shipping);
  const summary = routeSummary(routed);
  const allStore = summary.supplier === 0 && summary.split === 0 && summary.unavailable === 0;

  const lines = state.cart
    .map((line) => {
      const book = state.books.find((candidate) => candidate.id === line.bookId);
      if (!book) return "";
      const route = routeOrder([line], state.books)[0];
      const stockCopy =
        route.route === "STORE"
          ? `${route.fromStock} from the shelf`
          : route.route === "SUPPLIER"
            ? `Supplier · ${getLeadDays(book)} days`
            : `${route.fromStock} shelf + ${route.fromSupplier} supplier`;
      return `
        <div class="cart-line">
          ${miniCoverHtml(book)}
          <div>
            <h3>${escapeHtml(book.title)}</h3>
            <p class="cart-author">${escapeHtml(book.author)}</p>
            <p class="cart-stock is-${route.route.toLowerCase()}">${escapeHtml(stockCopy)}</p>
          </div>
          <div class="cart-line-side">
            <span class="cart-line-price">${formatMoney(book.price * line.qty)}</span>
            <div class="qty-stepper">
              <button type="button" data-action="qty" data-book-id="${escapeAttr(book.id)}" data-delta="-1" aria-label="Remove one copy of ${escapeAttr(book.title)}" ${line.qty <= 1 ? "disabled" : ""}>
                <svg width="11" height="11" aria-hidden="true"><use href="#i-minus"></use></svg>
              </button>
              <span aria-label="Quantity">${line.qty}</span>
              <button type="button" data-action="qty" data-book-id="${escapeAttr(book.id)}" data-delta="1" aria-label="Add one copy of ${escapeAttr(book.title)}" ${line.qty >= 9 ? "disabled" : ""}>
                <svg width="11" height="11" aria-hidden="true"><use href="#i-plus"></use></svg>
              </button>
            </div>
            <button class="remove-line" type="button" data-action="remove-line" data-book-id="${escapeAttr(book.id)}" aria-label="Remove ${escapeAttr(book.title)} from bag">
              <svg width="13" height="13" aria-hidden="true"><use href="#i-trash"></use></svg>
            </button>
          </div>
        </div>`;
    })
    .join("");

  const routeCopy = allStore
    ? "All copies come from the shop shelf. Pickup is ready in about 2 hours."
    : `${summary.store + summary.split} line${summary.store + summary.split === 1 ? "" : "s"} use shelf stock; supplier copies follow their lead time.`;

  els.cartBody.innerHTML = `
    <div class="cart-lines">${lines}</div>
    <div class="cart-summary">
      <span class="ship-label">How would you like it?</span>
      <div class="ship-options">
        ${Object.entries(SHIPPING)
          .map(
            ([key, option]) => `
            <label class="ship-option">
              <input type="radio" name="shipping" value="${key}" ${state.shipping === key ? "checked" : ""}>
              <span class="ship-option-main">
                <span>
                  <span class="ship-option-name">${escapeHtml(option.label)}</span>
                  <span class="ship-option-detail">${escapeHtml(option.detail)}</span>
                </span>
                <span class="ship-option-price">${option.price === 0 ? "Free" : formatMoney(option.price)}</span>
              </span>
            </label>`,
          )
          .join("")}
      </div>
      <div class="cart-totals">
        <div class="total-row"><span>Subtotal · ${totals.itemCount} ${totals.itemCount === 1 ? "copy" : "copies"}</span><span>${formatMoney(totals.subtotal)}</span></div>
        <div class="total-row"><span>${escapeHtml(SHIPPING[state.shipping].label)}</span><span>${totals.shipping === 0 ? "Free" : formatMoney(totals.shipping)}</span></div>
        <div class="total-row"><span>Oregon sales tax</span><span>$0.00</span></div>
        <div class="total-row grand"><span>Total</span><span>${formatMoney(totals.total)}</span></div>
      </div>
      <div class="route-preview ${allStore ? "" : "has-supplier"}">${escapeHtml(routeCopy)}</div>
      <button class="button button-primary checkout-button" type="button" data-action="checkout">
        Place demo order · ${formatMoney(totals.total)}
        <svg width="16" height="16" aria-hidden="true"><use href="#i-arrow"></use></svg>
      </button>
      <p class="checkout-note">Simulated checkout. No payment is taken and stock is reserved only in this browser session.</p>
    </div>`;
}

function renderOps() {
  renderKpis();
  renderInventory();
  renderOrders();
}

function renderKpis() {
  const units = state.books.reduce((sum, book) => sum + Math.max(0, Number(book.stock) || 0), 0);
  const supplierBacked = state.books.filter((book) => Number(book.stock) === 0).length;
  const lowStock = state.books.filter((book) => Number(book.stock) > 0 && Number(book.stock) <= Number(book.reorderAt)).length;

  els.opsKpis.innerHTML = `
    <div class="kpi">
      <p class="kpi-label">Catalog titles</p>
      <div class="kpi-value">${state.books.length}<small>titles</small></div>
      <p class="kpi-note">${Object.keys(suppliers).length} suppliers connected</p>
    </div>
    <div class="kpi">
      <p class="kpi-label">Copies on hand</p>
      <div class="kpi-value">${units}<small>units</small></div>
      <p class="kpi-note">${lowStock} low-stock title${lowStock === 1 ? "" : "s"} to watch</p>
    </div>
    <div class="kpi">
      <p class="kpi-label">Supplier-backed</p>
      <div class="kpi-value">${supplierBacked}<small>titles</small></div>
      <p class="kpi-note">Zero on shelf, still sellable</p>
    </div>
    <div class="kpi">
      <p class="kpi-label">Orders routed</p>
      <div class="kpi-value">${state.orders.length}<small>today</small></div>
      <p class="kpi-note">Shelf, supplier and split</p>
    </div>`;
}

function renderInventory() {
  const units = state.books.reduce((sum, book) => sum + Math.max(0, Number(book.stock) || 0), 0);
  els.inventoryMeta.textContent = `${state.books.length} titles · ${units} units`;
  els.inventoryRows.innerHTML = state.books
    .map((book) => {
      const stock = availability(book);
      const supplier = getSupplier(book);
      const stockClass = stock.key === "stock" ? "" : stock.key === "low" ? "is-low" : "is-out";
      return `
        <tr>
          <td class="title-cell"><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.author)}</span></td>
          <td class="isbn-cell">${escapeHtml(book.isbn)}</td>
          <td class="shelf-cell">${escapeHtml(book.shelf)}</td>
          <td class="num"><span class="stock-pill ${stockClass}">${book.stock}</span></td>
          <td class="supply-cell">${escapeHtml(supplier?.short ?? "—")} · ${getLeadDays(book)}d</td>
          <td><span class="status ${stockClass}">${stock.key === "stock" ? "In stock" : stock.key === "low" ? "Low" : "Supplier"}</span></td>
        </tr>`;
    })
    .join("");
}

function renderOrders() {
  const filtered = state.orders.filter((order) => state.routeFilter === "all" || orderRouteKey(order) === state.routeFilter);

  els.routeFilters.querySelectorAll("[data-route-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.routeFilter === state.routeFilter);
  });

  if (filtered.length === 0) {
    els.orderRows.innerHTML = `<tr><td colspan="6" style="padding:28px 9px;color:var(--muted);text-align:center;">No orders on this route yet.</td></tr>`;
  } else {
    els.orderRows.innerHTML = filtered
      .map((order) => {
        const key = orderRouteKey(order);
        const items = order.lines.map((line) => `${line.qty}× ${line.title}`).join(", ");
        return `
          <tr>
            <td class="order-id">${escapeHtml(order.id)}</td>
            <td class="customer-cell">${escapeHtml(order.customer)}</td>
            <td class="items-cell" title="${escapeAttr(items)}">${escapeHtml(items)}</td>
            <td><span class="route-badge is-${key}">${routeLabel(key === "store" ? "STORE" : key === "supplier" ? "SUPPLIER" : key === "split" ? "SPLIT" : "UNAVAILABLE")}</span></td>
            <td>${escapeHtml(order.status)}</td>
            <td class="num total-cell">${formatMoney(order.total)}</td>
          </tr>`;
      })
      .join("");
  }

  els.orderMeta.textContent = `${filtered.length} ${filtered.length === 1 ? "order" : "orders"}`;
}

function orderRouteKey(order) {
  const routes = new Set(order.lines.map((line) => line.route));
  if (routes.has("UNAVAILABLE")) return "unavailable";
  if (routes.has("SPLIT") || (routes.has("STORE") && routes.has("SUPPLIER"))) return "split";
  if (routes.has("SUPPLIER")) return "supplier";
  return "store";
}

function openBook(bookId) {
  const book = state.books.find((candidate) => candidate.id === bookId);
  if (!book) return;
  const stock = availability(book);
  const supplier = getSupplier(book);
  els.bookDialogBody.innerHTML = `
    <div class="book-detail">
      <button class="icon-button modal-close" type="button" data-action="close-dialog" aria-label="Close book details">
        <svg width="19" height="19" aria-hidden="true"><use href="#i-x"></use></svg>
      </button>
      <div class="book-detail-cover">${coverHtml(book)}</div>
      <div class="book-detail-info">
        <p class="book-cat">${escapeHtml(book.category)} · ${escapeHtml(book.badge)}</p>
        <h2>${escapeHtml(book.title)}</h2>
        <p class="book-detail-author">${escapeHtml(book.author)}</p>
        <p class="book-detail-blurb">${escapeHtml(book.blurb)}</p>
        <div class="book-specs">
          <div class="spec"><span>ISBN</span><strong>${escapeHtml(book.isbn)}</strong></div>
          <div class="spec"><span>Shelf</span><strong>${escapeHtml(book.shelf)}</strong></div>
          <div class="spec"><span>Format</span><strong>Paperback</strong></div>
          <div class="spec"><span>Pages</span><strong>${book.pages ?? "—"}</strong></div>
          <div class="spec"><span>Supplier</span><strong>${escapeHtml(supplier?.name ?? "—")}</strong></div>
          <div class="spec"><span>Lead time</span><strong>${getLeadDays(book)} days</strong></div>
        </div>
        ${
          book.coverCredit
            ? `<p class="cover-credit">Cover image: <a href="${escapeAttr(book.coverCredit.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(book.coverCredit.label)}</a></p>`
            : ""
        }
        <div class="book-buy">
          <span class="book-buy-price">${formatMoney(book.price)}</span>
          <button class="button button-primary" type="button" data-action="add-book" data-book-id="${escapeAttr(book.id)}">
            ${book.stock > 0 ? "Add to bag" : "Order from supplier"}
            <svg width="16" height="16" aria-hidden="true"><use href="#i-bag"></use></svg>
          </button>
          <p class="book-buy-stock"><strong>${escapeHtml(stock.label)}</strong> · ${escapeHtml(stock.detail)}${book.stock === 0 ? ` · ${escapeHtml(supplier?.name ?? "Supplier")} orders by ${escapeHtml(supplier?.cutoff ?? "2:00 PM")}` : ""}</p>
        </div>
      </div>
    </div>`;
  els.bookDialog.showModal();
}

function addToCart(bookId) {
  const book = state.books.find((candidate) => candidate.id === bookId);
  if (!book) return;
  const line = state.cart.find((item) => item.bookId === bookId);
  if (line) {
    if (line.qty >= 9) {
      toast("Nine copies is the demo limit for one title.");
      return;
    }
    line.qty += 1;
  } else {
    state.cart.push({ bookId, qty: 1 });
  }
  renderCart();
  renderBagCount();
  toast(`${book.title} added to your bag.`);
}

function changeQuantity(bookId, delta) {
  const line = state.cart.find((item) => item.bookId === bookId);
  if (!line) return;
  line.qty = Math.max(1, Math.min(9, line.qty + delta));
  renderCart();
  renderBagCount();
}

function removeLine(bookId) {
  state.cart = state.cart.filter((line) => line.bookId !== bookId);
  renderCart();
  renderBagCount();
}

function placeOrder() {
  if (state.cart.length === 0) return;
  const routed = routeOrder(state.cart, state.books);
  if (routed.some((line) => line.route === "UNAVAILABLE")) {
    toast("One title is no longer in the catalog. Remove it and try again.");
    return;
  }

  const totals = cartTotals(state.cart, state.books, state.shipping);
  const hasSupplier = routed.some((line) => line.fromSupplier > 0);
  const order = {
    id: `FS-${state.orderSeq}`,
    customer: "Demo customer",
    createdAt: "Just now",
    status: hasSupplier ? "Supplier ordered" : state.shipping === "pickup" ? "Ready for pickup" : "Picking",
    method: state.shipping,
    total: totals.total,
    lines: routed,
  };

  state.orderSeq += 1;
  state.books = allocateStock(state.books, routed);
  state.orders.unshift(order);
  state.lastOrder = order;
  state.cart = [];

  closeCart();
  renderAll();
  showConfirmation(order);
}

function showConfirmation(order) {
  const routeCount = routeSummary(order.lines);
  const summaryCopy =
    routeCount.supplier + routeCount.split > 0
      ? "The shelf copies are being pulled now. The supplier copies are already on their way to us."
      : "Every copy is on the shelf. We are pulling them now.";

  els.confirmBody.innerHTML = `
    <div class="confirm-body">
      <div class="confirm-icon">
        <svg width="22" height="22" aria-hidden="true"><use href="#i-check"></use></svg>
      </div>
      <h2>Order routed.</h2>
      <p class="confirm-lede">${escapeHtml(summaryCopy)}</p>
      <span class="confirm-order-id">${escapeHtml(order.id)} · ${escapeHtml(SHIPPING[order.method].label)}</span>
      <div class="confirm-routes">
        ${order.lines
          .map((line) => {
            const book = state.books.find((candidate) => candidate.id === line.bookId) ?? state.books.find((candidate) => candidate.isbn === line.isbn);
            const eta =
              line.route === "STORE"
                ? "Ready in about 2 hours"
                : line.route === "SUPPLIER"
                  ? `Est. ${estimatedDate(line.leadDays)}`
                  : `Shelf now · supplier est. ${estimatedDate(line.leadDays)}`;
            const detail =
              line.route === "STORE"
                ? `${line.fromStock} from the shop shelf`
                : line.route === "SUPPLIER"
                  ? `${line.fromSupplier} via ${line.supplier}`
                  : `${line.fromStock} shelf + ${line.fromSupplier} via ${line.supplier}`;
            return `
              <div class="confirm-route">
                <div>${book ? miniCoverHtml(book) : ""}</div>
                <div>
                  <h3>${escapeHtml(line.title)}</h3>
                  <p>${escapeHtml(detail)}</p>
                </div>
                <div class="confirm-route-side">
                  <strong>${escapeHtml(eta)}</strong>
                  <span>${formatMoney(line.price * line.qty)}</span>
                </div>
              </div>`;
          })
          .join("")}
      </div>
      <div class="confirm-total">
        <span>Total charged in demo</span>
        <strong>${formatMoney(order.total)}</strong>
      </div>
      <div class="confirm-actions">
        <button class="button button-primary" type="button" data-action="confirm-router">
          See it in the order router
          <svg width="16" height="16" aria-hidden="true"><use href="#i-route"></use></svg>
        </button>
        <button class="button button-quiet" type="button" data-action="close-dialog">Keep browsing</button>
      </div>
    </div>`;
  els.confirmDialog.showModal();
}

function handleScan() {
  const raw = els.scanInput.value.trim();
  if (!raw) {
    renderScanError("Enter an ISBN first.", "The scanner field is empty.");
    return;
  }
  const isbn = normaliseIsbn(raw);
  if (!isValidIsbn13(isbn)) {
    renderScanError("That barcode is not a valid ISBN-13.", "Check the digits and try again. The checksum did not match.");
    return;
  }
  const book = findBookByIsbn(state.books, isbn);
  if (!book) {
    renderScanError(
      "No match in the catalog.",
      `ISBN ${isbn} passed the checksum but is not on the shelf yet.`,
      isbn,
    );
    return;
  }
  renderScanBook(book);
}

function renderScanBook(book) {
  const stock = availability(book);
  const supplier = getSupplier(book);
  els.scanResult.innerHTML = `
    <div class="scan-found">
      ${miniCoverHtml(book)}
      <div>
        <h3>${escapeHtml(book.title)}</h3>
        <p class="scan-author">${escapeHtml(book.author)}</p>
        <div class="scan-facts">
          <span class="scan-fact">Shelf ${escapeHtml(book.shelf)}</span>
          <span class="scan-fact ${book.stock === 0 ? "is-warn" : ""}">${book.stock} on hand</span>
          <span class="scan-fact">${escapeHtml(supplier?.short ?? "Supplier")} · ${getLeadDays(book)}d</span>
          <span class="scan-fact ${stock.key === "supplier" ? "is-warn" : ""}">${escapeHtml(stock.label)}</span>
        </div>
        <button class="add-button" type="button" data-action="add-book" data-book-id="${escapeAttr(book.id)}">
          <svg width="12" height="12" aria-hidden="true"><use href="#i-plus"></use></svg>
          ${book.stock > 0 ? "Add to bag" : "Order in"}
        </button>
      </div>
    </div>`;
}

function renderScanError(title, copy, isbn = "") {
  els.scanResult.innerHTML = `
    <div class="scan-error">
      <strong>${escapeHtml(title)}</strong>
      ${escapeHtml(copy)}
      ${isbn ? `<br><button class="text-button" type="button" data-action="prefill-import" data-isbn="${escapeAttr(isbn)}" style="margin-top:6px;color:inherit;">Start a catalog import for this ISBN</button>` : ""}
    </div>`;
}

function handleImport() {
  const result = importCatalog(els.csvInput.value, state.books, suppliers);
  if (result.added.length > 0) {
    state.books = result.nextBooks;
    renderHero();
    renderCategories();
    renderBooks();
    renderInventory();
    renderKpis();
  }

  const isSuccess = result.added.length > 0 && result.errors.length === 0;
  els.importResult.classList.add("is-visible");
  els.importResult.classList.toggle("has-errors", !isSuccess);

  const errorList = result.errors.slice(0, 3).map((error) => `<li>Line ${error.line}: ${escapeHtml(error.message)}</li>`).join("");
  els.importResult.innerHTML = `
    <strong>${isSuccess ? "Catalog updated." : result.added.length > 0 ? "Imported with a few rows held back." : "Nothing imported."}</strong>
    ${result.added.length} added · ${result.skipped.length} duplicate${result.skipped.length === 1 ? "" : "s"} skipped · ${result.errors.length} validation error${result.errors.length === 1 ? "" : "s"}.
    ${errorList ? `<ul>${errorList}</ul>` : ""}`;

  if (result.added.length > 0) {
    toast(`${result.added.length} new title${result.added.length === 1 ? "" : "s"} added to the shelf.`);
    updateImportHint();
  }
}

function updateImportHint() {
  const rows = els.csvInput.value.split(/\r?\n/).filter((line) => line.trim() !== "").length;
  const dataRows = Math.max(0, rows - 1);
  els.importHint.textContent = dataRows ? `${dataRows} row${dataRows === 1 ? "" : "s"} ready to validate` : "Paste a header row and at least one title";
}

function prefillImport(isbn) {
  const header = "isbn,title,author,category,price,stock,supplier,lead_days,shelf,blurb";
  els.csvInput.value = `${header}\n${isbn},,,,,,,,,`;
  els.csvInput.focus();
  updateImportHint();
  document.querySelector(".importer-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  toast("ISBN added to the catalog importer.");
}

function clearFilters() {
  state.filters = { query: "", category: "All", sort: "curated", staffOnly: false };
  els.bookSearch.value = "";
  els.sortSelect.value = "curated";
  setNav("shop");
  renderCategories();
  renderBooks();
}

function goShop() {
  state.view = "shop";
  state.filters = { query: "", category: "All", sort: "curated", staffOnly: false };
  els.bookSearch.value = "";
  els.sortSelect.value = "curated";
  setNav("shop");
  els.shopView.hidden = false;
  els.opsView.hidden = true;
  renderCategories();
  renderBooks();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showStaffPicks() {
  state.view = "shop";
  state.filters.staffOnly = true;
  state.filters.category = "All";
  state.filters.query = "";
  els.bookSearch.value = "";
  setNav("staff");
  els.shopView.hidden = false;
  els.opsView.hidden = true;
  renderCategories();
  renderBooks();
  setTimeout(() => {
    document.querySelector("#shelfSection").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

function goOps() {
  state.view = "ops";
  setNav("ops");
  els.shopView.hidden = true;
  els.opsView.hidden = false;
  renderOps();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setNav(active) {
  state.nav = active;
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.nav === active);
  });
}

function openCart() {
  if (state.cart.length === 0) {
    renderCart();
  }
  els.overlay.hidden = false;
  els.cartDrawer.classList.add("is-open");
  els.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
}

function closeCart() {
  els.cartDrawer.classList.remove("is-open");
  els.overlay.hidden = true;
  document.body.classList.remove("locked");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2600);
}

const toast = showToast;

function coverHtml(book, variant = "") {
  if (book.coverImage) {
    return `
      <div class="book-cover book-cover--image ${variant}" style="--cover:${escapeAttr(book.cover.bg)}" aria-hidden="true">
        <img class="cover-image" src="${escapeAttr(book.coverImage)}" alt="" loading="lazy" decoding="async" style="object-position:${escapeAttr(book.coverPosition ?? "center")}">
      </div>`;
  }

  const titleClass = book.title.length > 22 ? "is-long" : "";
  return `
    <div class="book-cover ${variant} motif-${escapeAttr(book.cover.motif)}" style="--cover:${escapeAttr(book.cover.bg)};--ink:${escapeAttr(book.cover.ink)};--accent:${escapeAttr(book.cover.accent)}" aria-hidden="true">
      <span class="cover-kicker">${escapeHtml(book.category)}</span>
      <span class="cover-title ${titleClass}">${escapeHtml(book.title)}</span>
      <span class="cover-author">${escapeHtml(book.author)}</span>
      <span class="cover-mark">Folio &amp; Co.</span>
    </div>`;
}

function miniCoverHtml(book) {
  return coverHtml(book, "book-cover--mini");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
}

function escapeAttr(value) {
  return escapeHtml(value);
}
