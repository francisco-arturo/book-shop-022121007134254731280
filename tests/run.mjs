import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { seedBooks, seedOrders, sampleCsv } from "../assets/data.mjs";
import {
  allocateStock,
  availability,
  cartTotals,
  estimatedDate,
  filterBooks,
  findBookByIsbn,
  importCatalog,
  isValidIsbn13,
  normaliseIsbn,
  parseCatalogCsv,
  routeOrder,
  routeSummary,
} from "../assets/engine.mjs";

const books = seedBooks.map((book) => ({ ...book }));
const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok ${passed} - ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`not ok - ${name}`);
    console.error(`  ${error.message.split("\n")[0]}`);
  }
}

test("ISBN-13 checksums accept real barcodes and reject mistyped ones", () => {
  assert.equal(isValidIsbn13("978-0-7432-7356-5"), true);
  assert.equal(isValidIsbn13("9780743273565"), true);
  assert.equal(isValidIsbn13("9780743273566"), false);
  assert.equal(isValidIsbn13("123"), false);
  assert.equal(normaliseIsbn(" 978 0 7432 7356 5 "), "9780743273565");
  assert.equal(findBookByIsbn(books, "978-0-7432-7356-5")?.title, "The Great Gatsby");
});

test("every seeded classic has a valid ISBN, local cover image and credit", () => {
  assert.equal(seedBooks.length, 14);
  assert.equal(new Set(seedBooks.map((book) => book.isbn)).size, 14);
  for (const book of seedBooks) {
    assert.equal(isValidIsbn13(book.isbn), true, book.title);
    assert.ok(book.coverImage, `${book.title} needs a cover image`);
    assert.equal(existsSync(resolve(projectRoot, book.coverImage)), true, `${book.title} cover missing`);
    assert.ok(book.coverCredit?.label, `${book.title} needs a cover credit`);
    assert.ok(book.coverCredit?.url?.startsWith("https://commons.wikimedia.org/"), `${book.title} credit source`);
  }
});

test("availability distinguishes shelf, low and supplier stock", () => {
  assert.equal(availability(books.find((book) => book.id === "pride")).key, "stock");
  assert.equal(availability(books.find((book) => book.id === "hound")).key, "low");
  assert.equal(availability(books.find((book) => book.id === "jane-eyre")).key, "supplier");
});

test("router sends shelf copies, supplier copies and partial lines to the right place", () => {
  const [shelf] = routeOrder([{ bookId: "pride", qty: 2 }], books);
  assert.equal(shelf.route, "STORE");
  assert.equal(shelf.fromStock, 2);
  assert.equal(shelf.fromSupplier, 0);

  const [supplier] = routeOrder([{ bookId: "jane-eyre", qty: 1 }], books);
  assert.equal(supplier.route, "SUPPLIER");
  assert.equal(supplier.fromStock, 0);
  assert.equal(supplier.fromSupplier, 1);
  assert.equal(supplier.leadDays, 2);

  const [split] = routeOrder([{ bookId: "hound", qty: 4 }], books);
  assert.equal(split.route, "SPLIT");
  assert.equal(split.fromStock, 3);
  assert.equal(split.fromSupplier, 1);
  assert.equal(split.leadDays, 4);
});

test("routing a multi-title order summarises each route", () => {
  const routed = routeOrder(
    [
      { bookId: "pride", qty: 1 },
      { bookId: "jane-eyre", qty: 1 },
      { bookId: "hound", qty: 4 },
    ],
    books,
  );
  assert.deepEqual(routeSummary(routed), {
    store: 1,
    supplier: 1,
    split: 1,
    unavailable: 0,
  });
});

test("stock allocation only deducts shelf copies and never goes negative", () => {
  const after = allocateStock(books, [
    { bookId: "pride", fromStock: 2 },
    { bookId: "hound", fromStock: 3 },
    { bookId: "jane-eyre", fromStock: 0 },
  ]);
  assert.equal(after.find((book) => book.id === "pride").stock, 3);
  assert.equal(after.find((book) => book.id === "hound").stock, 0);
  assert.equal(after.find((book) => book.id === "jane-eyre").stock, 0);
  assert.equal(books.find((book) => book.id === "pride").stock, 5);
});

test("cart totals include the selected shipping method and ignore tax", () => {
  const cart = [
    { bookId: "pride", qty: 2 },
    { bookId: "jane-eyre", qty: 1 },
  ];
  const pickup = cartTotals(cart, books, "pickup");
  assert.equal(pickup.itemCount, 3);
  assert.equal(pickup.subtotal, 30.97);
  assert.equal(pickup.shipping, 0);
  assert.equal(pickup.total, 30.97);

  const standard = cartTotals(cart, books, "standard");
  assert.equal(standard.shipping, 4.5);
  assert.equal(standard.total, 35.47);
});

test("catalog CSV parsing handles quoted commas and validates rows", () => {
  const parsed = parseCatalogCsv(sampleCsv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.records.length, 4);
  assert.equal(parsed.records[0].title, "The Scarlet Letter");
  assert.equal(parsed.records[1].supplier, "bookazine");
  assert.match(parsed.records[0].blurb, /private letter/);
});

test("catalog parsing reports invalid checksums and unknown suppliers", () => {
  const csv = `isbn,title,author,category,price,stock,supplier,lead_days,shelf,blurb
9780743273566,Bad barcode,Someone,Fiction,15.00,0,bookazine,2,F-BAD,"Broken checksum."
9780141439518,Pride and Prejudice,Jane Austen,Fiction,9.99,0,unknown,3,F-AUS,"Unknown supplier."`;
  const parsed = parseCatalogCsv(csv);
  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.errors.length, 2);
  assert.match(parsed.errors[0].message, /checksum/);
  assert.match(parsed.errors[1].message, /Unknown supplier/);
});

test("catalog import adds new classics and skips duplicates", () => {
  const first = importCatalog(sampleCsv, books);
  assert.equal(first.added.length, 4);
  assert.equal(first.skipped.length, 0);
  assert.equal(first.errors.length, 0);
  assert.equal(first.nextBooks.length, books.length + 4);

  const second = importCatalog(sampleCsv, first.nextBooks);
  assert.equal(second.added.length, 0);
  assert.equal(second.skipped.length, 4);
  assert.equal(second.nextBooks.length, first.nextBooks.length);
});

test("seed orders total consistently with their routed lines", () => {
  for (const order of seedOrders) {
    const subtotal = order.lines.reduce((sum, line) => {
      const book = seedBooks.find((candidate) => candidate.isbn === line.isbn);
      return sum + (book?.price ?? 0) * line.qty;
    }, 0);
    const shipping = order.method === "standard" ? 4.5 : order.method === "express" ? 9.5 : 0;
    assert.equal(Math.round((subtotal + shipping) * 100) / 100, order.total, order.id);
  }
});

test("staff picks and stock-first filters behave predictably", () => {
  const staff = filterBooks(books, { staffOnly: true });
  assert.ok(staff.length >= 4);
  assert.ok(staff.every((book) => book.staffPick));

  const inStockFirst = filterBooks(books, { sort: "stock-first" });
  assert.ok(inStockFirst.findIndex((book) => book.stock > 0) < inStockFirst.findIndex((book) => book.stock === 0));
});

test("estimated supplier dates are human-readable", () => {
  const base = new Date(2026, 10, 13, 12, 0, 0);
  assert.equal(estimatedDate(2, base), "Nov 15");
  assert.equal(estimatedDate(4, base), "Nov 17");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.error("\nFailures:");
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.error.message}`);
  }
  process.exitCode = 1;
}
