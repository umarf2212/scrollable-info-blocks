import { copyFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

await copyFile(resolve(root, "scripts/distribution-server.mjs"), resolve(dist, "server.js"));
await writeFile(
  resolve(dist, "package.json"),
  `${JSON.stringify({
    name: "infoblocks-distributable",
    version: "1.0.0",
    private: true,
    type: "module",
    engines: { node: ">=22.13.0" },
    scripts: { start: "node server.js" },
  }, null, 2)}\n`,
  "utf8",
);

console.log("Packaged dist/server.js and dist/package.json");
