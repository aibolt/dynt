# Releasing DYNT

DYNT releases four public npm packages at one version: `@dynt/formation`, `@dynt/kinetic`, `@dynt/react`, and `@dynt/web-components`. The repository root remains private to npm.

## Release prerequisites

1. The `@dynt` npm organization exists and the release owner has publish access.
2. Every public package name in this repository belongs to that organization.
3. The GitHub `npm` environment restricts deployment to trusted maintainers.
4. After the first publish, each package trusts `aibolt/dynt`, workflow `release.yml`, environment `npm`, with `npm publish` permission.
5. Trusted publishing uses a GitHub-hosted runner, Node 24 or newer, and npm 11.5.1 or newer.

If the package names return no public registry version, creating or granting access to the npm organization is an external owner action; source changes cannot provide that authority.

## First-release bootstrap

Trusted publisher settings are attached to an existing npm package. For the first release only, create a narrowly scoped npm automation token that can publish public packages in `@dynt`, store it as the `NPM_TOKEN` secret on the protected GitHub `npm` environment, and run the tagged workflow below.

After all four packages exist:

1. Configure each package's trusted publisher with the values above.
2. Restrict package publishing to require two-factor authentication and disallow traditional tokens.
3. Delete the bootstrap `NPM_TOKEN` secret and revoke the token.

The release workflow keeps the secret optional. With trusted publishing configured, npm uses short-lived OIDC credentials and generates provenance.

## Prepare a version

1. Update the root and all workspace versions together.
2. Update internal optional peer ranges when the minor compatibility line changes.
3. Add the release to `CHANGELOG.md` and record any migration requirement.
4. Run:

```bash
npm ci
npm test
npm run test:browser
npm run test:packages
npm audit --audit-level=high
RELEASE_TAG=v0.5.0 npm run verify:release-version
```

5. Merge the verified release change before creating the tag.

## Publish

Create and push an annotated tag matching the package version exactly, for example `v0.5.0`. The Release workflow repeats every verification gate and publishes each missing package version with public access and provenance.

The publish script is restart-safe. If a job stops after publishing only some workspaces, rerun the same job; versions already present are verified and skipped, and only missing versions are published.

After completion, verify all four npm package pages, provenance links, tarball contents, and a clean registry installation. Then create GitHub release notes from the matching changelog entry.

## Rollback and recovery

npm versions are immutable. Never reuse a faulty version number.

For a non-security defect:

1. Deprecate the affected version with a clear message.
2. Revert or fix the source in a new commit.
3. Increment the patch version across every workspace.
4. Run all gates and publish a new tag.

If a multi-package publish stops partway through, first rerun the same release job. If a package cannot be completed, deprecate any already-published workspace versions and issue a new synchronized patch version.

For a security defect, follow `SECURITY.md`, prepare the fix privately, publish a new version, then disclose only after consumers can upgrade. Unpublish only when npm policy permits and deprecation cannot contain the risk.
