#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import app from "./server/index.js";

const distributionRoot = dirname(fileURLToPath(import.meta.url));
const clientRoot = resolve(distributionRoot, "client");
const host = process.env.HOST?.trim() || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`PORT must be an integer from 1 to 65535; received ${process.env.PORT}.`);
}

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function assetPath(pathname) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decodedPath.includes("\0")) return null;

  const candidate = resolve(clientRoot, `.${decodedPath}`);
  const pathFromRoot = relative(clientRoot, candidate);

  if (pathFromRoot === "" || pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`)) {
    return null;
  }

  return candidate;
}

async function serveAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const url = new URL(request.url);
  const filePath = assetPath(url.pathname);
  if (!filePath) return null;

  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch {
    return null;
  }

  if (!fileStats.isFile()) return null;

  const headers = new Headers({
    "cache-control": url.pathname.startsWith("/_next/static/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600",
    "content-length": String(fileStats.size),
    "content-type": contentTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream",
    "x-content-type-options": "nosniff",
  });

  const body = request.method === "HEAD" ? null : await readFile(filePath);
  return new Response(body, { status: 200, headers });
}

const assets = {
  async fetch(request) {
    return (await serveAsset(request)) || new Response("Not found", { status: 404 });
  },
};

function toWebRequest(request) {
  const protocol = request.socket.encrypted ? "https" : "http";
  const authority = request.headers.host || `${host}:${port}`;
  const headers = new Headers();

  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    headers.append(request.rawHeaders[index], request.rawHeaders[index + 1]);
  }

  if (!headers.has("x-forwarded-host")) headers.set("x-forwarded-host", authority);
  if (!headers.has("x-forwarded-proto")) headers.set("x-forwarded-proto", protocol);

  const init = { method: request.method, headers };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = Readable.toWeb(request);
    init.duplex = "half";
  }

  return new Request(new URL(request.url || "/", `${protocol}://${authority}`), init);
}

function executionContext() {
  const pending = new Set();

  return {
    props: {},
    passThroughOnException() {},
    waitUntil(task) {
      const promise = Promise.resolve(task);
      pending.add(promise);
      promise.finally(() => pending.delete(promise));
    },
  };
}

async function writeResponse(nodeResponse, webResponse, requestMethod) {
  nodeResponse.statusCode = webResponse.status;
  if (webResponse.statusText) nodeResponse.statusMessage = webResponse.statusText;

  const cookies = webResponse.headers.getSetCookie?.() || [];
  webResponse.headers.forEach((value, name) => {
    if (name !== "set-cookie") nodeResponse.setHeader(name, value);
  });
  if (cookies.length > 0) nodeResponse.setHeader("set-cookie", cookies);

  if (requestMethod === "HEAD" || !webResponse.body) {
    nodeResponse.end();
    return;
  }

  for await (const chunk of Readable.fromWeb(webResponse.body)) {
    if (!nodeResponse.write(chunk)) {
      await new Promise((resolveDrain) => nodeResponse.once("drain", resolveDrain));
    }
  }
  nodeResponse.end();
}

const server = createServer(async (request, response) => {
  try {
    const webRequest = toWebRequest(request);
    const staticResponse = await serveAsset(webRequest);
    const webResponse = staticResponse || (await app.fetch(webRequest, { ASSETS: assets }, executionContext()));
    await writeResponse(response, webResponse, request.method);
  } catch (error) {
    console.error(error);
    if (response.headersSent) {
      response.destroy(error);
    } else {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Internal server error");
    }
  }
});

server.on("error", (error) => {
  console.error(`Unable to start InfoBlocks: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log("InfoBlocks is ready.");
  console.log(`Local:   http://localhost:${port}`);

  if (host === "0.0.0.0" || host === "::") {
    const addresses = Object.values(networkInterfaces())
      .flat()
      .filter((address) => address?.family === "IPv4" && !address.internal)
      .map((address) => address.address);

    for (const address of [...new Set(addresses)]) {
      console.log(`Network: http://${address}:${port}`);
    }
  }
});

function stop() {
  server.close(() => process.exit(0));
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
