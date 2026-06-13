import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const root = resolve(".");
const port = Number(process.env.PORT || process.argv[2] || 5173);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function resolveRequest(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const requested = resolve(join(root, normalized));

  if (!requested.startsWith(root)) {
    return null;
  }

  if (!existsSync(requested)) {
    return null;
  }

  return statSync(requested).isDirectory() ? join(requested, "index.html") : requested;
}

createServer((request, response) => {
  const file = resolveRequest(request.url);

  if (!file || !existsSync(file)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "cache-control": "no-cache",
    "content-type": types[extname(file)] || "application/octet-stream"
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Smartplan PWA: http://localhost:${port}`);
});
