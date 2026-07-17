# Security policy

## Supported versions

The current `0.5.x` preview line receives security fixes. Unreleased development snapshots and older preview lines are not supported after a replacement is published.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use the repository's private [security advisory form](https://github.com/aibolt/dynt/security/advisories/new). Include the affected package and version, impact, reproduction steps or proof of concept, and any suggested mitigation. If private reporting is unavailable, contact an `aibolt/dynt` repository owner privately through GitHub before sharing details elsewhere.

A maintainer will acknowledge a complete report, assess severity and affected versions, coordinate a fix and disclosure, and credit the reporter unless anonymity is requested. Do not test against systems or data you do not own or have permission to use.

## Supply chain

Release builds use a clean install, tests, a three-engine browser matrix, package-tarball verification, dependency audit, and npm provenance. Published package metadata must point to this repository. Repository secrets, registry tokens, and private data must never be committed.
