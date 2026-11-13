import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { pathToFileURL } from "node:url";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export function createAppServer(root = process.cwd()) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      const pathname = decodeURIComponent(url.pathname);
      const requested = pathname === "/" ? "/index.html" : pathname;
      const safe = normalize(requested).replace(/^(\.\.[/\\])+/, "");
      const filePath = join(root, safe);

      if (!filePath.startsWith(root + sep) && filePath !== join(root, "index.html")) {
        response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
      }

      const info = await stat(filePath);
      if (!info.isFile()) throw new Error("Not a file");

      const body = await readFile(filePath);
      response.writeHead(200, {
        "content-type": types[extname(filePath)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const port = Number(process.env.PORT || 4197);
  createAppServer().listen(port, "127.0.0.1", () => {
    console.log(`Folio & Co. running at http://127.0.0.1:${port}`);
  });
}
