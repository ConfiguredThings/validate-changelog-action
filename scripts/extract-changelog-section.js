const { spawnSync } = require('child_process');

// Usage: node scripts/extract-changelog-section.js <version> [changelog-path]
//
// Prints the body of the "## [<version>]" section (heading and trailing
// reference link stripped) to stdout. Relies on `mdq` (https://github.com/yshavit/mdq)
// to parse the changelog as Markdown rather than scanning it line-by-line, so
// the match is anchored against the section's actual heading text — not a
// naive substring of the file. Exits 1 if no matching, non-empty section exists.

const version = process.argv[2];
const changelogPath = process.argv[3] ?? 'CHANGELOG.md';

if (!version) {
  console.error('Usage: node scripts/extract-changelog-section.js <version> [changelog-path]');
  process.exit(1);
}

// Tags are often prefixed with "v" (e.g. "v2") while the changelog heading
// may or may not include it — accept either form.
const candidates = version.startsWith('v') ? [version, version.slice(1)] : [version, `v${version}`];

function runMdq(matcher) {
  const result = spawnSync('mdq', [`# ^${matcher}$`, changelogPath], { encoding: 'utf8' });
  if (result.error) {
    console.error(`Failed to run mdq: ${result.error.message}`);
    process.exit(1);
  }
  return result;
}

let output = null;
let matched = null;
for (const candidate of candidates) {
  const result = runMdq(candidate);
  if (result.status === 0) {
    output = result.stdout;
    matched = candidate;
    break;
  }
}

if (output === null) {
  console.error(`No changelog section found for version "${version}" in ${changelogPath}`);
  process.exit(1);
}

// Strip the "## [...]" heading line and the section's own "[matched]: url"
// reference link line — but leave any other reference-style link
// definitions inside the body alone (e.g. links cited by the notes text).
const escapedMatch = matched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ownReferenceLinkPattern = new RegExp(`^\\[${escapedMatch}\\]:\\s`);
const body = output
  .split('\n')
  .filter(line => !line.startsWith('## ') && !ownReferenceLinkPattern.test(line))
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

if (!body) {
  console.error(`Changelog section for version "${version}" is empty`);
  process.exit(1);
}

console.log(body);
