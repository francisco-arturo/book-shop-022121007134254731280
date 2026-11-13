import assert from "node:assert/strict";

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
  assert.equal(isValidIsbn13("978-0-393-63552-2"), true);
  assert.equal(isValidIsbn13("9781635575637"), true);
  assert.equal(isValidIsbn13("9781635575638"), false);
  assert.equal(isValidIsbn13("123"), false);
  assert.equal(normaliseIsbn(" 978 1 63557 563 7 "), "9781635575637");
  assert.equal(findBookByIsbn(books, "978-0-393-63552-2")?.title, "The Overstory");
});

test("availability distinguishes shelf, low and supplier stock", () => {
  assert.equal(availability(books.find((book) => book.id === "overstory")).key, "stock");
  assert.equal(availability(books.find((book) => book.id === "lefthand")).key, "low");
  assert.equal(availability(books.find((book) => book.id === "piranesi")).key, "supplier");
});

test("router sends shelf copies, supplier copies and partial lines to the right place", () => {
  const [shelf] = routeOrder([{ bookId: "overstory", qty: 2 }], books);
  assert.equal(shelf.route, "STORE");
  assert.equal(shelf.fromStock, 2);
  assert.equal(shelf.fromSupplier, 0);

  const [supplier] = routeOrder([{ bookId: "piranesi", qty: 1 }], books);
  assert.equal(supplier.route, "SUPPLIER");
  assert.equal(supplier.fromStock, 0);
  assert.equal(supplier.fromSupplier, 1);
  assert.equal(supplier.leadDays, 2);

  const [split] = routeOrder([{ bookId: "lefthand", qty: 3 }], books);
  assert.equal(split.route, "SPLIT");
  assert.equal(split.fromStock, 2);
  assert.equal(split.fromSupplier, 1);
  assert.equal(split.leadDays, 3);
});

test("routing a multi-title order summarises each route", () => {
  const routed = routeOrder(
    [
      { bookId: "overstory", qty: 1 },
      { bookId: "piranesi", qty: 1 },
      { bookId: "lefthand", qty: 3 },
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
    { bookId: "overstory", fromStock: 2 },
    { bookId: "lefthand", fromStock: 2 },
    { bookId: "piranesi", fromStock: 0 },
  ]);
  assert.equal(after.find((book) => book.id === "overstory").stock, 4);
  assert.equal(after.find((book) => book.id === "lefthand").stock, 0);
  assert.equal(after.find((book) => book.id === "piranesi").stock, 0);
  assert.equal(books.find((book) => book.id === "overstory").stock, 6);
});

test("cart totals include the selected shipping method and ignore tax", () => {
  const cart = [
    { bookId: "overstory", qty: 2 },
    { bookId: "piranesi", qty: 1 },
  ];
  const pickup = cartTotals(cart, books, "pickup");
  assert.equal(pickup.itemCount, 3);
  assert.equal(pickup.subtotal, 54.9);
  assert.equal(pickup.shipping, 0);
  assert.equal(pickup.total, 54.9);

  const standard = cartTotals(cart, books, "standard");
  assert.equal(standard.shipping, 4.5);
  assert.equal(standard.total, 59.4);
});

test("catalog CSV parsing handles quoted commas and validates rows", () => {
  const csv = `isbn,title,author,category,price,stock,supplier,lead_days,shelf,blurb
9780062316097,"Sapiens: A Brief History of Humankind",Yuval Noah Harari,Essays,18.99,0,ingram,3,E-HAR,"A history, with a comma, in the blurb."
9781635575637,Piranesi,Susanna Clarke,Fiction,17.00,0,bookazine,2,F-CLA,"A house of tides and statues."`;
  const parsed = parseCatalogCsv(csv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].blurb, "A history, with a comma, in the blurb.");
  assert.equal(parsed.records[1].supplier, "bookazine");
});

test("catalog parsing reports invalid checksums and unknown suppliers", () => {
  const csv = `isbn,title,author,category,price,stock,supplier,lead_days,shelf,blurb
9781635575638,Bad barcode,Someone,Fiction,17.00,0,bookazine,2,F-BAD,"Broken checksum."
9780062316097,Sapiens,Yuval Noah Harari,Essays,18.99,0,unknown,3,E-HAR,"Unknown supplier."`;
  const parsed = parseCatalogCsv(csv);
  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.errors.length, 2);
  assert.match(parsed.errors[0].message, /checksum/);
  assert.match(parsed.errors[1].message, /Unknown supplier/);
});

test("catalog import adds new titles and skips duplicates", () => {
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
