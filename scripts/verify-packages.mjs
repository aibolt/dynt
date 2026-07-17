import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("..", import.meta.url));
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "dynt-packages-"));

try {
  const packageDirectory = path.join(temporaryRoot, "packages");
  const consumerDirectory = path.join(temporaryRoot, "consumer");
  await mkdir(packageDirectory);
  await mkdir(consumerDirectory);

  execFileSync("npm", [
    "pack",
    "--workspaces",
    "--pack-destination",
    packageDirectory,
  ], { cwd: repository, stdio: "inherit" });

  const tarballs = (await readdir(packageDirectory))
    .filter((name) => name.endsWith(".tgz"))
    .map((name) => path.join(packageDirectory, name));
  assert.equal(tarballs.length, 4, "Expected one tarball for each public workspace.");

  await writeFile(path.join(consumerDirectory, "package.json"), JSON.stringify({
    name: "dynt-package-verification",
    private: true,
    type: "module",
  }, null, 2));

  execFileSync("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...tarballs,
    "react@19.2.7",
  ], { cwd: consumerDirectory, stdio: "inherit" });

  const verify = `
    import assert from "node:assert/strict";
    import { access } from "node:fs/promises";
    import { fileURLToPath } from "node:url";
    import { createFormation } from "@dynt/formation";
    import { createKinetic } from "@dynt/kinetic";
    import { useFormation } from "@dynt/react/formation";
    import { useKinetic } from "@dynt/react/kinetic";
    import { defineFormationElement } from "@dynt/web-components/formation";
    import { defineKineticElement } from "@dynt/web-components/kinetic";

    for (const exportedFunction of [
      createFormation,
      createKinetic,
      useFormation,
      useKinetic,
      defineFormationElement,
      defineKineticElement,
    ]) {
      assert.equal(typeof exportedFunction, "function");
    }

    await access(fileURLToPath(import.meta.resolve("@dynt/formation/styles.css")));
    await access(fileURLToPath(import.meta.resolve("@dynt/kinetic/styles.css")));
  `;
  execFileSync(process.execPath, ["--input-type=module", "--eval", verify], {
    cwd: consumerDirectory,
    stdio: "inherit",
  });

  for (const tarball of tarballs) await access(tarball);
  console.log("Verified four DYNT packages from clean tarballs.");
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
