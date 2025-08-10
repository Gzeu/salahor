# Contributing to uniconnect

Thanks for your interest in contributing!

## Development Setup
- Node.js 18+
- Clone the repo and install dev environment (no deps required for build).

## Testing
- Tests use Node's built-in runner.
- Run: `npm test`
- Add tests under `test/` with `.test.mjs` suffix.

## Coding Guidelines
- Keep zero dependencies.
- ESM only (`type: module`).
- Small, focused PRs with clear descriptions.

## Versioning & Release
- Follow SemVer.
- `npm version [patch|minor|major]` to bump and create git tag.
- `npm publish --access public` to publish.
- `git push origin main --follow-tags` to push code and tags.

## Reporting Issues
- Use GitHub Issues. Include Node version, OS, reproduction steps, and expected/actual behavior.
