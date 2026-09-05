# Validate Keep a Changelog

A GitHub Action that validates a `CHANGELOG.md` file conforms to the [Keep a Changelog](https://keepachangelog.com/) format.

## What it checks

- The title line is exactly `# Changelog`.
- No manual table of contents (anchor links) before the first `## [version]` section.
- `### ` subsections use only the approved Keep a Changelog types (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`), with no duplicates within a single section.
- Every `## [version]` section has a matching `[version]: https://...` reference link at the bottom of the file.
- The `[Unreleased]` reference link compares the most recent version to `HEAD` (e.g. `.../compare/v1.2.0...HEAD`).

## Usage

```yaml
name: Validate Changelog

on:
  pull_request:
    paths:
      - CHANGELOG.md

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ConfiguredThings/validate-changelog-action@v1
```

## Try it locally

No install required — the action is a single Node script that reads its input the same way GitHub Actions does (an `INPUT_<NAME>` environment variable per input). Node 24 is required to match `action.yml`.

Validate a `CHANGELOG.md` in the current directory:

```sh
node validate/index.js
```

Validate a changelog at a different path:

```sh
env "INPUT_CHANGELOG-PATH=path/to/CHANGELOG.md" node validate/index.js
```

The script exits with a non-zero status and prints `::error ...` lines for each violation, or prints a `✓ ... compliant` message on success — matching what you'd see in a workflow run.

## Inputs

| Name              | Description                     | Required | Default          |
|-------------------|----------------------------------|----------|-------------------|
| `changelog-path`  | Path to the changelog file       | No       | `CHANGELOG.md`     |

```yaml
- uses: ConfiguredThings/validate-changelog-action@v1
  with:
    changelog-path: docs/CHANGELOG.md
```

## Releasing

Pushing a tag matching `v*` triggers [`.github/workflows/release.yml`](.github/workflows/release.yml), which:

1. Runs this action against `CHANGELOG.md` to make sure it's still compliant.
2. Installs a pinned release of [`mdq`](https://github.com/yshavit/mdq) (a `jq`-for-Markdown CLI) and uses it, via `scripts/extract-changelog-section.js`, to extract the `## [<tag>]` section body — matched against the heading's actual parsed text, not a line-scan regex (accepts the tag with or without a leading `v`, e.g. tag `v2` matches a `## [v2]` or `## [2]` heading).
3. Fails the workflow if no matching, non-empty section is found — the release notes must come from the changelog, so a tag with no changelog entry can't ship.
4. Creates the GitHub release for that tag using the extracted section as the release notes.

Running the extraction script locally requires `mdq` on your `PATH` (`brew install mdq`, or download a binary from its [releases page](https://github.com/yshavit/mdq/releases)):

```sh
node scripts/extract-changelog-section.js v2
```

## License

[MIT](LICENSE)
