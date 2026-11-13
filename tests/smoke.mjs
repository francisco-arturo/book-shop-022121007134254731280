import assert from "node:assert/strict";
import { createAppServer } from "../dev-server.mjs";

const server = createAppServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

try {
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200, "entry route should return 200");
  assert.match(page.headers.get("content-type") ?? "", /text\/html/);
  const html = await page.text();
  assert.match(html, /Folio &amp; Co\./);
  assert.match(html, /id="bookGrid"/);
  assert.match(html, /id="scanInput"/);
  assert.match(html, /id="csvInput"/);
  assert.match(html, /id="orderRows"/);

  const css = await fetch(`${base}/assets/styles.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get("content-type") ?? "", /text\/css/);

  const app = await fetch(`${base}/assets/app.mjs`);
  assert.equal(app.status, 200);
  assert.match(app.headers.get("content-type") ?? "", /javascript/);

  const missing = await fetch(`${base}/does-not-exist`);
  assert.equal(missing.status, 404);

  console.log(`ok 13 - local server returns the app shell, CSS and JS (${base})`);
  console.log(`ok 14 - unknown routes return 404`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}
