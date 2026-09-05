# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v4] - 2026-09-06
### Added
- Validation that every released `## [version]` section has a trailing release date in the format `- YYYY-MM-DD`, and that `[Unreleased]` does not.

### Fixed
- `extract/action.yml`'s `mdq` selector was invalid syntax and silently failed to match dated version headings (e.g. `## [1.7.1] - 2026-08-31`). Replaced with an anchored regex selector that matches whether or not the heading resolves as a reference link, without colliding on version-prefix overlaps (e.g. `1.1` vs `1.10`).

## [v3] - 2026-09-06
### Added
- `extract/action.yml` sub-action that extracts a single version's section from a Keep a Changelog file (via [`mdq`](https://github.com/yshavit/mdq)), for driving GitHub release notes from the changelog.
- `.github/workflows/release.yml` — pushing a `v*` tag now validates the changelog, extracts the matching section, and creates a GitHub release from it, failing if no matching section is found.
- `README.md` and this `CHANGELOG.md`.

### Changed
- Moved validation logic into `validate/action.yml` + `validate/index.js`, now directly callable as its own sub-action alongside `extract/`. The root action is unchanged for existing consumers.

## [v2] - 2026-04-03
### Changed
- Refactored validation logic for changelog compliance and enhanced error reporting.
- Updated Node version from 22 to 24 in `action.yml`.

## [v1] - 2026-04-02
### Added
- Initial implementation of the validate-changelog action.

[Unreleased]: https://github.com/ConfiguredThings/validate-changelog-action/compare/v4...HEAD
[v4]: https://github.com/ConfiguredThings/validate-changelog-action/compare/v3...v4
[v3]: https://github.com/ConfiguredThings/validate-changelog-action/compare/v2...v3
[v2]: https://github.com/ConfiguredThings/validate-changelog-action/compare/v1...v2
[v1]: https://github.com/ConfiguredThings/validate-changelog-action/releases/tag/v1
