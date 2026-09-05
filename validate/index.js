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
const sections = parseSections(lines);
const referenceLinks = parseReferenceLinks(lines);

// Returns [{name, lineIndex}] for every ## [name] heading
function parseSections(lines) {
  const pattern = /^## \[(.+?)\]/;
  return lines.flatMap((line, i) => {
    const m = line.match(pattern);
    return m ? [{ name: m[1], lineIndex: i }] : [];
  });
}

// Returns Map<name, url> for every [name]: url reference link
function parseReferenceLinks(lines) {
  const pattern = /^\[(.+?)\]:\s+(https?:\/\/.+)/;
  const links = new Map();
  for (const line of lines) {
    const m = line.match(pattern);
    if (m) links.set(m[1], m[2].trim());
  }
  return links;
}

function validateSyntax(lines, sections, referenceLinks) {
  const errors = [];

  // 1. Title must be "# Changelog" (not HTML)
  if (lines[0].trim() !== '# Changelog') {
    errors.push(`Title line must be "# Changelog", got: "${lines[0].trim()}"`);
  }

  // 2. No manual TOC — reject list items containing anchor links before the first ## section
  const firstH2Index = lines.findIndex(l => l.startsWith('## '));
  const tocLinkPattern = /^[-*]\s+\[.*\]\(#[^)]+\)/;
  for (let i = 0; i < firstH2Index; i++) {
    if (tocLinkPattern.test(lines[i])) {
      errors.push(`Line ${i + 1}: Manual TOC link found (remove the table of contents): ${lines[i].trim()}`);
      break;
    }
  }

  // 3. ### subsections must use approved Keep a Changelog types, with no duplicates within any ## section
  const approvedSubsections = new Set(['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']);
  let currentSection = null;
  const seenSubsections = new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      currentSection = line.trim();
      seenSubsections.set(currentSection, new Set());
    } else if (line.startsWith('### ') && currentSection) {
      const sub = line.trim();
      const subName = sub.replace(/^###\s+/, '');
      if (!approvedSubsections.has(subName)) {
        errors.push(`Line ${i + 1}: "${subName}" is not an approved Keep a Changelog subsection (allowed: ${[...approvedSubsections].join(', ')})`);
      }
      const seen = seenSubsections.get(currentSection);
      if (seen.has(sub)) {
        errors.push(`Line ${i + 1}: Duplicate subsection "${sub}" in section "${currentSection}"`);
      } else {
        seen.add(sub);
      }
    }
  }

  // 4. Every ## [version] section must have a reference link at the bottom
  for (const { name } of sections) {
    if (!referenceLinks.has(name)) {
      errors.push(`Missing reference link for section [${name}] — add a "[${name}]: https://..." line at the bottom of the file`);
    }
  }

  return errors;
}

function validateSemantics(sections, referenceLinks) {
  const errors = [];

  // 5. [Unreleased] reference link must diff from the most recent version tag to HEAD
  const unreleasedUrl = referenceLinks.get('Unreleased');
  const mostRecentVersion = sections.find(s => s.name !== 'Unreleased')?.name;
  if (unreleasedUrl && mostRecentVersion) {
    const escapedVersion = mostRecentVersion.replace(/\./g, '\\.');
    const validPattern = new RegExp(`/compare/v?${escapedVersion}\\.\\.\\.HEAD$`, 'i');
    if (!validPattern.test(unreleasedUrl)) {
      errors.push(`[Unreleased] link must compare the most recent version (${mostRecentVersion}) to HEAD — expected URL ending in /compare/v?${mostRecentVersion}...HEAD, got: ${unreleasedUrl}`);
    }
  }

  return errors;
}

const syntaxErrors = validateSyntax(lines, sections, referenceLinks);
const semanticErrors = validateSemantics(sections, referenceLinks);

for (const error of [...syntaxErrors, ...semanticErrors]) {
  setFailed(error);
}

if (syntaxErrors.length === 0 && semanticErrors.length === 0) {
  console.log(`✓ ${changelogPath} is Keep a Changelog compliant (${sections.length} section(s) validated).`);
}
