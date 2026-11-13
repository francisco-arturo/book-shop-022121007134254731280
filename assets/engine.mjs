import { coverPalettes, suppliers } from "./data.mjs";

export const SHIPPING = {
  pickup: { label: "Shop pickup", detail: "Free · ready in about 2 hours", price: 0 },
  standard: { label: "Standard shipping", detail: "3–5 business days · $4.50", price: 4.5 },
  express: { label: "Express shipping", detail: "1–2 business days · $9.50", price: 9.5 },
};

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(roundMoney(value));
}

export function normaliseIsbn(value) {
  return String(value ?? "").replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn13(value) {
  const isbn = normaliseIsbn(value);
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(isbn[index]) * (index % 2 === 0 ? 1 : 3);
  }
  return Number(isbn[12]) === (10 - (sum % 10)) % 10;
}

export function findBookByIsbn(books, value) {
  const isbn = normaliseIsbn(value);
  return books.find((book) => normaliseIsbn(book.isbn) === isbn) ?? null;
}

export function getSupplier(book) {
  return suppliers[book?.supplier] ?? null;
}

export function getLeadDays(book) {
  const supplier = getSupplier(book);
  return Number(book?.leadDays ?? supplier?.leadDays ?? 3);
}

export function availability(book) {
  const stock = Math.max(0, Number(book?.stock) || 0);
  if (stock > Number(book?.reorderAt ?? 2)) {
    return {
      key: "stock",
      label: "In stock",
      detail: `${stock} on the shelf`,
      tone: "in",
    };
  }
  if (stock > 0) {
    return {
      key: "low",
      label: "Low stock",
      detail: `Only ${stock} left`,
      tone: "low",
    };
  }
  return {
    key: "supplier",
    label: "From supplier",
    detail: `Ships in ${getLeadDays(book)} days`,
    tone: "supplier",
  };
}

export function routeOrder(cartLines, books) {
  return cartLines.map((line) => {
    const book = books.find((candidate) => candidate.id === line.bookId || candidate.isbn === line.isbn);
    const quantity = Math.max(1, Math.min(9, Number(line.qty) || 1));

    if (!book) {
      return {
        bookId: null,
        isbn: line.isbn,
        title: "Unknown title",
        author: "",
        qty: quantity,
        price: 0,
        fromStock: 0,
        fromSupplier: quantity,
        route: "UNAVAILABLE",
        supplier: null,
        leadDays: 0,
        note: "This ISBN is not in the catalog.",
      };
    }

    const onHand = Math.max(0, Number(book.stock) || 0);
    const fromStock = Math.min(quantity, onHand);
    const fromSupplier = quantity - fromStock;
    const supplier = getSupplier(book);
    const route = fromSupplier === 0 ? "STORE" : fromStock === 0 ? "SUPPLIER" : "SPLIT";

    return {
      bookId: book.id,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      qty: quantity,
      price: Number(book.price) || 0,
      lineTotal: roundMoney((Number(book.price) || 0) * quantity),
      fromStock,
      fromSupplier,
      route,
      supplier: supplier?.name ?? "Supplier network",
      leadDays: fromSupplier > 0 ? getLeadDays(book) : 0,
      note:
        route === "STORE"
          ? "Pulled from the shop shelf"
          : route === "SUPPLIER"
            ? "Ordered from the supplier"
            : `${fromStock} from the shelf, ${fromSupplier} from the supplier`,
    };
  });
}

export function allocateStock(books, routedLines) {
  const deductions = new Map();
  for (const line of routedLines) {
    if (!line.bookId || !line.fromStock) continue;
    deductions.set(line.bookId, (deductions.get(line.bookId) ?? 0) + line.fromStock);
  }
  return books.map((book) => {
    const taken = deductions.get(book.id) ?? 0;
    if (!taken) return { ...book };
    return { ...book, stock: Math.max(0, Number(book.stock) - taken) };
  });
}

export function cartTotals(cartLines, books, method = "pickup") {
  const subtotal = cartLines.reduce((sum, line) => {
    const book = books.find((candidate) => candidate.id === line.bookId || candidate.isbn === line.isbn);
    return sum + (Number(book?.price) || 0) * Math.max(1, Number(line.qty) || 1);
  }, 0);
  const shipping = SHIPPING[method]?.price ?? SHIPPING.pickup.price;
  return {
    itemCount: cartLines.reduce((sum, line) => sum + Math.max(1, Number(line.qty) || 1), 0),
    subtotal: roundMoney(subtotal),
    shipping: roundMoney(shipping),
    total: roundMoney(subtotal + shipping),
  };
}

export function estimatedDate(leadDays, base = new Date()) {
  const date = new Date(base.getTime());
  date.setDate(date.getDate() + Math.max(0, Number(leadDays) || 0));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function parseCatalogCsv(text) {
  const rows = parseCsvRows(String(text ?? ""));
  const errors = [];

  if (rows.length === 0) {
    return { records: [], errors: [{ line: 0, message: "Paste a CSV with a header row to begin." }] };
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/\s+/g, "_"));
  const required = ["isbn", "title", "author", "price"];
  for (const field of required) {
    if (!headers.includes(field)) {
      errors.push({ line: 1, message: `Missing required column: ${field}` });
    }
  }
  if (errors.length) return { records: [], errors };

  const records = [];
  const seen = new Set();
  rows.slice(1).forEach((row, index) => {
    const line = index + 2;
    if (row.every((cell) => cell.trim() === "")) return;

    const raw = Object.fromEntries(headers.map((header, column) => [header, (row[column] ?? "").trim()]));
    const isbn = normaliseIsbn(raw.isbn);
    if (!isValidIsbn13(isbn)) {
      errors.push({ line, message: `ISBN ${raw.isbn || "(blank)"} failed the checksum.` });
      return;
    }
    if (seen.has(isbn)) {
      errors.push({ line, message: `ISBN ${isbn} appears twice in this file.` });
      return;
    }
    if (!raw.title || !raw.author) {
      errors.push({ line, message: "Title and author are required." });
      return;
    }
    const price = Number(String(raw.price).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(price) || price <= 0) {
      errors.push({ line, message: `Price "${raw.price}" is not a valid amount.` });
      return;
    }
    const stock = Math.max(0, Math.floor(Number(raw.stock) || 0));
    const supplierKey = resolveSupplier(raw.supplier);
    if (!supplierKey) {
      errors.push({ line, message: `Unknown supplier "${raw.supplier}". Use ingram, bookazine or prh.` });
      return;
    }

    seen.add(isbn);
    records.push({
      isbn,
      title: raw.title,
      author: raw.author,
      category: raw.category || "Uncategorised",
      price: roundMoney(price),
      stock,
      reorderAt: Math.max(1, Math.min(3, Math.ceil(stock / 2) || 1)),
      supplier: supplierKey,
      leadDays: Number(raw.lead_days) || suppliers[supplierKey].leadDays,
      shelf: raw.shelf || "NEW",
      year: null,
      pages: null,
      staffPick: false,
      badge: "Newly imported",
      blurb: raw.blurb || "Newly imported title. Add a shelf note from the catalog console.",
    });
  });

  return { records, errors };
}

export function importCatalog(text, books, supplierMap = suppliers) {
  const { records, errors } = parseCatalogCsv(text);
  const existing = new Set(books.map((book) => normaliseIsbn(book.isbn)));
  const added = [];
  const skipped = [];

  for (const record of records) {
    if (existing.has(record.isbn)) {
      skipped.push({ isbn: record.isbn, title: record.title, reason: "Already in the catalog" });
      continue;
    }
    const palette = coverPalettes[hashString(record.isbn) % coverPalettes.length];
    const supplier = supplierMap[record.supplier];
    added.push({
      ...record,
      id: `import-${record.isbn}`,
      leadDays: Number(record.leadDays) || supplier?.leadDays || 3,
      cover: palette,
    });
    existing.add(record.isbn);
  }

  return { added, skipped, errors, nextBooks: [...books, ...added] };
}

export function filterBooks(books, { query = "", category = "All", sort = "curated", staffOnly = false } = {}) {
  const needle = query.trim().toLowerCase();
  let result = books.filter((book) => {
    if (category !== "All" && book.category !== category) return false;
    if (staffOnly && !book.staffPick) return false;
    if (!needle) return true;
    return [book.title, book.author, book.isbn, book.category, book.shelf]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  if (sort === "price-asc") result = [...result].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") result = [...result].sort((a, b) => b.price - a.price);
  if (sort === "stock-first") {
    result = [...result].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
  }
  if (sort === "newest") {
    result = [...result].sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
  }
  return result;
}

export function routeSummary(lines) {
  return {
    store: lines.filter((line) => line.route === "STORE").length,
    supplier: lines.filter((line) => line.route === "SUPPLIER").length,
    split: lines.filter((line) => line.route === "SPLIT").length,
    unavailable: lines.filter((line) => line.route === "UNAVAILABLE").length,
  };
}

export function routeLabel(route) {
  return {
    STORE: "From shelf",
    SUPPLIER: "Supplier",
    SPLIT: "Split route",
    UNAVAILABLE: "Unavailable",
  }[route] ?? route;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((cell) => cell.trim() !== ""));
}

function resolveSupplier(value) {
  const needle = String(value ?? "").trim().toLowerCase();
  if (!needle) return null;
  if (suppliers[needle]) return needle;
  return (
    Object.keys(suppliers).find((key) => {
      return suppliers[key].name.toLowerCase() === needle || suppliers[key].short.toLowerCase() === needle;
    }) ?? null
  );
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
