import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const repository = new URL("../", import.meta.url);
const packageFiles = [
  "packages/formation/package.json",
  "packages/kinetic/package.json",
  "packages/react/package.json",
  "packages/web-components/package.json",
];

for (const file of packageFiles) {
  const manifest = JSON.parse(await readFile(new URL(file, repository), "utf8"));
  const packageVersion = `${manifest.name}@${manifest.version}`;
  const existing = spawnSync("npm", ["view", packageVersion, "version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (existing.status === 0) {
    console.log(`Skipping ${packageVersion}; it is already published.`);
    continue;
  }
  if (!existing.stderr.includes("E404")) {
    throw new Error(`Could not verify ${packageVersion}: ${existing.stderr.trim()}`);
  }

  execFileSync("npm", [
    "publish",
    "--workspace",
    manifest.name,
    "--access",
    "public",
    "--provenance",
  ], { stdio: "inherit" });
}
