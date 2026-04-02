const fs = require('fs');
const path = require('path');

// GitHub Actions sets INPUT_<NAME> for each input, with hyphens uppercased
const changelogPath = process.env['INPUT_CHANGELOG-PATH'] ?? 'CHANGELOG.md';
const fullPath = path.resolve(process.env.GITHUB_WORKSPACE ?? '.', changelogPath);

function setFailed(message) {
  console.error(`::error file=${changelogPath}::${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(fullPath)) {
  setFailed(`Changelog file not found: ${changelogPath}`);
  process.exit(1);
}

const content = fs.readFileSync(fullPath, 'utf8');
const lines = content.split('\n');
let failed = false;

function fail(message) {
  setFailed(message);
  failed = true;
}

// 1. Title must be "# Changelog" (not HTML)
if (lines[0].trim() !== '# Changelog') {
  fail(`Title line must be "# Changelog", got: "${lines[0].trim()}"`);
}

// 2. No manual TOC — reject list items containing anchor links before the first ## section
const firstH2 = lines.findIndex(l => l.startsWith('## '));
const tocLinkPattern = /^[-*]\s+\[.*\]\(#[^)]+\)/;
for (let i = 0; i < firstH2; i++) {
  if (tocLinkPattern.test(lines[i])) {
    fail(`Line ${i + 1}: Manual TOC link found (remove the table of contents): ${lines[i].trim()}`);
    break;
  }
}

// 3. No duplicate ### subsections within any ## section
let currentSection = null;
const seenSubsections = new Map();
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('## ')) {
    currentSection = line.trim();
    seenSubsections.set(currentSection, new Set());
  } else if (line.startsWith('### ') && currentSection) {
    const sub = line.trim();
    const seen = seenSubsections.get(currentSection);
    if (seen.has(sub)) {
      fail(`Line ${i + 1}: Duplicate subsection "${sub}" in section "${currentSection}"`);
    } else {
      seen.add(sub);
    }
  }
}

// 4. Every ## [version] section must have a reference link at the bottom
const sectionPattern = /^## \[(.+?)\]/;
const linkPattern = /^\[(.+?)\]:\s+https?:\/\//;
const sections = lines.filter(l => sectionPattern.test(l)).map(l => l.match(sectionPattern)[1]);
const links = new Set(lines.filter(l => linkPattern.test(l)).map(l => l.match(linkPattern)[1]));
for (const section of sections) {
  if (!links.has(section)) {
    fail(`Missing reference link for section [${section}] — add a "[${section}]: https://..." line at the bottom of the file`);
  }
}

if (!failed) {
  console.log(`✓ ${changelogPath} is Keep a Changelog compliant (${sections.length} section(s) validated).`);
}
