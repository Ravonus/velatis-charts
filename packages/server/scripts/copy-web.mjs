import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(directory, "../../web/dist");
const target = path.resolve(directory, "../public");

if (!fs.existsSync(path.join(webDist, "index.html"))) {
  throw new Error("The web package must be built before the server package");
}

fs.rmSync(target, { force: true, recursive: true });
fs.cpSync(webDist, target, { recursive: true });
