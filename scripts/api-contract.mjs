#!/usr/bin/env node
/**
 * Keeps the vendored API contract and response fixtures in step with the
 * sibling backend checkout (../get-it-done-BE).
 *
 *   pnpm contract:sync   copy contract JSON + fixtures from the BE
 *   pnpm contract:check  diff only; exit 1 when they differ
 *
 * CI cannot see the other repo, so with no sibling this exits 0 with a note.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const be = resolve(root, "..", "get-it-done-BE");
const mode = process.argv[2] === "check" ? "check" : "sync";

const pairs = [
  [join(be, "docs", "api-contract.json"), join(root, "src", "app", "contracts", "api-contract.json")],
];
const fixtureSrc = join(be, "test", "fixtures", "responses");
const fixtureDst = join(root, "src", "app", "contracts", "__fixtures__");

if (!existsSync(be)) {
  console.log("contract: sibling ../get-it-done-BE not found; nothing to " + mode);
  process.exit(0);
}
if (existsSync(fixtureSrc)) {
  for (const name of readdirSync(fixtureSrc)) {
    if (name.endsWith(".json")) pairs.push([join(fixtureSrc, name), join(fixtureDst, name)]);
  }
}

// Line endings differ between checkouts; compare content, not bytes of EOL.
const norm = (p) => (existsSync(p) ? readFileSync(p, "utf8").replace(/\r\n/g, "\n") : null);
let drift = 0;
for (const [src, dst] of pairs) {
  const same = norm(src) === norm(dst);
  if (same) continue;
  drift += 1;
  if (mode === "sync") {
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    console.log("synced", dst.replace(root + "\\", "").replace(root + "/", ""));
  } else {
    console.error("differs", dst.replace(root + "\\", "").replace(root + "/", ""));
  }
}
if (mode === "check" && drift > 0) {
  console.error(`contract: ${drift} file(s) out of date. Run: pnpm contract:sync`);
  process.exit(1);
}
console.log(mode === "check" ? "contract: up to date" : `contract: ${drift} file(s) updated`);
