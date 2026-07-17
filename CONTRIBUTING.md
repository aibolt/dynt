# Contributing to DYNT

Thank you for contributing to DYNT. This project accepts carefully scoped, professionally prepared changes through reviewed pull requests.

Outside contributions are reviewed manually by a maintainer. Maintainer-authored internal work may be approved and merged after the required automated checks without a separate reviewer. Agent assistance may support development, but it does not replace engineering responsibility, verification, or owner control.

## Non-negotiable requirements

Before submitting a contribution, you must:

- Understand every line and behavior you submit.
- Keep the change focused on one clear problem or capability.
- Preserve the independent package boundary between Formation and Kinetic.
- Add or update tests for every behavior change.
- Run the relevant build, tests, and security audit locally.
- Update documentation when an API, configuration, or user-facing behavior changes.
- Confirm that the contribution contains no secrets, private data, proprietary code, or incompatible third-party material.
- Use DYNT terminology throughout code, documentation, issues, pull requests, commits, and releases.

Incomplete, unexplained, unverified, or bulk-generated changes will not be merged.

## Agent-assisted development

DYNT may be developed with help from LLM agents and other automated tools. Code produced with these tools is held to the same standard as code written manually.

If an agent or code-generation tool materially assisted your contribution:

1. Disclose that assistance in the pull request.
2. Describe which parts were agent-assisted.
3. For an outside contribution, review the complete diff yourself before submission.
4. Verify all claims, APIs, dependencies, tests, and documentation independently.
5. Remove speculative code, fabricated references, unnecessary abstractions, and unrelated changes.
6. Confirm that no credentials, private data, or restricted source material were provided to the tool.

The contributor remains fully responsible for correctness, security, licensing, performance, accessibility, and maintainability. An agent's explanation, generated test, or approval is not accepted as evidence of correctness.

## Architecture rules

### Formation

`@dynt/formation` owns construction geometry and visual lifecycle. It must remain usable without Kinetic or a UI framework.

### Kinetic

`@dynt/kinetic` owns physical and pointer-driven response. It must remain usable without Formation or a UI framework.

### Framework adapters

Adapters may manage framework mounting, updates, and cleanup. They must not duplicate engine behavior or make a framework dependency part of an engine package.

### DOM behavior

Enhancement must be explicitly scoped by a root and selector. It must preserve element semantics, keyboard access, focus behavior, application-owned attributes, and application-owned classes. Cleanup must restore the state owned by the application.

## Before starting substantial work

Open an issue or discussion before starting a change that:

- Introduces a new public API or formation profile.
- Adds a dependency or framework adapter.
- Changes package boundaries or shared contracts.
- Alters lifecycle, accessibility, performance, or cleanup behavior.
- Requires a migration or introduces a breaking change.

Small fixes may go directly to a focused pull request when the intent and impact are clear.

## Development workflow

1. Create a branch from the latest `main`.
2. Make the smallest complete change that solves the stated problem.
3. Keep refactoring separate unless it is required for the change.
4. Add tests that fail without the change and pass with it.
5. Run the required verification commands.
6. Review the full diff for accidental files, debug output, generated artifacts, and unrelated formatting.
7. Push the branch and open a pull request.

Do not commit directly to a protected branch.

## Required verification

Run these commands from the repository root:

```bash
npm test
npm run build
npm run test:browser
npm run test:packages
npm audit --audit-level=high
```

Also complete any package-specific checks relevant to the change.

For visual or interaction changes, include evidence for normal motion and reduced motion. Verify keyboard operation, focus visibility, cleanup, nested ownership, responsive behavior, and browser compatibility where relevant.

Passing commands are necessary but not sufficient. Reviewers will also inspect behavior, design fit, failure modes, API quality, and maintainability.

## Pull request requirements

Each pull request must include:

- A concise problem statement.
- A summary of the chosen solution.
- The exact scope and any deliberate exclusions.
- Test and build results.
- Screenshots or recordings for visible interaction changes.
- Public API or migration notes when applicable.
- Agent-assistance disclosure when applicable.
- Known limitations, risks, or follow-up work.

Keep pull requests small enough to review carefully. Split unrelated work into separate pull requests.

## Review and merge policy

- Maintainers manually inspect every outside contribution.
- Maintainer-authored internal changes may be owner-approved and merged after all required checks pass; an additional reviewer is not required.
- Automated checks support outside-contribution review but never replace it.
- Outside contributions require an owner approval before merge.
- Contributors must address review comments or explain the technical reason for a different approach.
- Maintainers may request changes, additional tests, a smaller scope, or a revised design.
- Outside contributors may not approve or merge their own pull requests. A maintainer may owner-approve and merge maintainer-authored work after every required automated gate passes.
- Approval may be withdrawn when new changes materially alter the reviewed behavior.

Maintainers may close a contribution that repeatedly ignores the project scope, architecture rules, review feedback, security requirements, or professional conduct standards.

## Dependencies and security

- Avoid new runtime dependencies unless the benefit and maintenance cost are documented.
- Pin dependency versions and include the updated lockfile.
- Do not weaken audit, type, accessibility, or test requirements to make a change pass.
- Never commit credentials, tokens, personal data, private URLs, or environment files.
- Do not disclose a suspected security vulnerability in a public issue. Contact the maintainers privately through GitHub instead.

## Source ownership and provenance

Submit only work you are authorized to contribute. Do not copy proprietary implementations, restricted source code, or material with an incompatible license. Identify any third-party algorithm, asset, or substantial reference and confirm that its use is permitted.

## Contributor checklist

This checklist is required before an outside contributor requests review. Maintainer-authored internal work must complete the same technical checks but does not require an additional manual reviewer.

Before requesting review, confirm:

- [ ] The change has one clear purpose.
- [ ] I understand and manually reviewed the complete diff.
- [ ] I disclosed material agent assistance.
- [ ] Formation and Kinetic remain independently usable.
- [ ] Tests cover the changed behavior.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:browser` passes when browser behavior is affected.
- [ ] `npm run test:packages` passes when package metadata, exports, or dependencies change.
- [ ] `npm audit --audit-level=high` reports no unresolved high-severity issue.
- [ ] Documentation and examples are accurate.
- [ ] Accessibility and reduced-motion behavior are preserved.
- [ ] No secrets, private data, restricted code, or unrelated files are included.
- [ ] DYNT terminology is used consistently.
