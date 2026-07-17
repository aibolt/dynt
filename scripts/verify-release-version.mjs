import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const repository = new URL("../", import.meta.url);
const packageFiles = [
  "package.json",
  "packages/formation/package.json",
  "packages/kinetic/package.json",
  "packages/react/package.json",
  "packages/web-components/package.json",
];
const manifests = await Promise.all(packageFiles.map(async (file) => (
  JSON.parse(await readFile(new URL(file, repository), "utf8"))
)));
const expectedVersion = manifests[0].version;

for (const manifest of manifests) {
  assert.equal(manifest.version, expectedVersion, `${manifest.name} has a mismatched version.`);
}

const tag = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME;
if (tag) assert.equal(tag, `v${expectedVersion}`, "Release tag does not match package versions.");

console.log(`Verified DYNT release version ${expectedVersion}.`);
