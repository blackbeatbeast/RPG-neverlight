import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const ok = (condition, message) => { if (!condition) errors.push(message); };
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const required = [
  'README.md', 'PROJECT_PLAN_JA.md', 'AGENTS.md', 'CODEX_START_HERE.md',
  'config/product-constraints.yml', 'config/feature-flags.example.json',
  'docs/00_EXECUTIVE_BRIEF.md', 'docs/01_HISTORICAL_REFERENCE.md',
  'docs/02_PRODUCT_VISION.md', 'docs/03_GAME_DESIGN.md',
  'docs/04_UX_UI_SPEC.md', 'docs/05_TECH_ARCHITECTURE.md',
  'docs/06_DATA_ECONOMY.md', 'docs/07_CONTENT_R15_SAFETY.md',
  'docs/08_LEGAL_CLEAN_ROOM.md', 'docs/09_MONETIZATION_READINESS.md',
  'docs/10_ROADMAP.md', 'docs/11_CODEX_WORKPLAN.md',
  'docs/12_DECISIONS_OPEN_QUESTIONS.md', 'docs/13_CONTENT_PIPELINE.md',
  'docs/CODEX_SKILLS_CATALOG.md', 'docs/SOURCES.md',
  'docs/15_REQUIREMENTS_TRACEABILITY.md', 'docs/16_FREE_TIER_BUDGET.md',
  'docs/17_CODEX_COMMANDS_JA.md',
  'provenance/ASSET_PROVENANCE.md', 'provenance/RESEARCH_LOG.md',
  'content/examples/bundle.json',
  'backlog/00_EPICS.md', 'PUBLISH_TO_GITHUB.md', 'PUBLISH_RPG_NEVERLIGHT.cmd'
];
for (const file of required) ok(exists(file), `Missing required file: ${file}`);

const flags = JSON.parse(read('config/feature-flags.example.json'));
for (const key of ['monetization.enabled', 'ads.enabled', 'supporterShop.enabled', 'pvp.enabled', 'market.enabled', 'trade.enabled', 'presentation.suggestive.enabled']) {
  ok(flags.flags[key] === false, `Feature flag must default false: ${key}`);
}

const constraints = read('config/product-constraints.yml');
ok(/named_character_minimum_age:\s*20\b/.test(constraints), 'Named character minimum age must be 20.');
ok(/monetization_enabled:\s*false\b/.test(constraints), 'Monetization must default false.');
ok(/paid_random_rewards_allowed:\s*false\b/.test(constraints), 'Paid random rewards must be forbidden.');
ok(/mandatory_animation:\s*false\b/.test(constraints), 'Mandatory animation must remain false.');

const jsonFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.json')) jsonFiles.push(full);
  }
}
walk(root);
for (const file of jsonFiles) {
  try { JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { errors.push(`Invalid JSON ${path.relative(root, file)}: ${error.message}`); }
}

const characters = JSON.parse(read('content/examples/bundle.json')).characters;
for (const character of characters) {
  ok(Number.isInteger(character.age) && character.age >= 20, `${character.id} must have integer age >= 20.`);
  ok(Boolean(character.generalAssetId), `${character.id} needs a general asset.`);
  if (character.suggestiveAssetId) {
    ok(Boolean(character.suggestiveAssetId), `${character.id} has a suggestive asset reference without a general fallback.`);
    ok(Boolean(character.generalAssetId), `${character.id} suggestive variant lacks general fallback.`);
  }
}

const skillsRoot = path.join(root, '.agents', 'skills');
const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
ok(skillDirs.length === 18, `Expected 18 Skills, found ${skillDirs.length}.`);
const skillNames = new Set();
for (const dir of skillDirs) {
  const relative = `.agents/skills/${dir.name}/SKILL.md`;
  ok(exists(relative), `Missing ${relative}`);
  if (!exists(relative)) continue;
  const text = read(relative);
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  ok(Boolean(match), `Missing YAML front matter in ${relative}`);
  if (!match) continue;
  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  ok(name === dir.name, `Skill name must match folder in ${relative}.`);
  ok(Boolean(description), `Skill description missing in ${relative}.`);
  ok((description?.length ?? 0) <= 360, `Skill description too long in ${relative}.`);
  ok(!skillNames.has(name), `Duplicate Skill name: ${name}`);
  skillNames.add(name);
  for (const heading of ['## Mission', '## Required inputs', '## Workflow', '## Required outputs', '## Verification', '## Stop and escalate', '## Handoff']) {
    ok(text.includes(heading), `${relative} missing ${heading}`);
  }
}

const backlog = fs.readdirSync(path.join(root, 'backlog')).filter((name) => /^\d{3}-.+\.md$/.test(name));
ok(backlog.length === 15, `Expected 15 numbered backlog packets, found ${backlog.length}.`);
for (const file of backlog) {
  const text = read(`backlog/${file}`);
  for (const heading of ['## Objective', '## In scope', '## Out of scope', '## Acceptance criteria', '## Verification', '## Stop and escalate when']) {
    ok(text.includes(heading), `${file} missing ${heading}`);
  }
}

const adrFiles = fs.readdirSync(path.join(root, 'docs', 'adr')).filter((name) => name.endsWith('.md'));
ok(adrFiles.length >= 7, `Expected at least 7 ADRs, found ${adrFiles.length}.`);

// Check local Markdown links. Ignore URLs, anchors, mailto, and sandbox links.
const mdFiles = [];
function walkMarkdown(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full);
    else if (entry.name.endsWith('.md')) mdFiles.push(full);
  }
}
walkMarkdown(root);
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
for (const file of mdFiles) {
  const text = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = linkPattern.exec(text))) {
    const target = match[1].split('#')[0].trim();
    if (!target || /^(https?:|mailto:|sandbox:)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    ok(fs.existsSync(resolved), `Broken local link in ${path.relative(root, file)}: ${match[1]}`);
  }
}

// Historical protected title is allowed only in research/legal source documents.
const allowedHistorical = new Set([
  'docs/01_HISTORICAL_REFERENCE.md', 'docs/SOURCES.md', 'provenance/RESEARCH_LOG.md'
]);
for (const file of mdFiles) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (!allowedHistorical.has(rel) && fs.readFileSync(file, 'utf8').includes('ネバーワールドオンライン')) {
    errors.push(`Historical title appears outside approved research files: ${rel}`);
  }
}

if (warnings.length) {
  console.warn('Warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error(`Blueprint validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Blueprint validation passed.');
console.log(`- Required files checked: ${required.length}`);
console.log(`- Skills checked: ${skillDirs.length}`);
console.log(`- Backlog packets checked: ${backlog.length}`);
console.log(`- ADRs checked: ${adrFiles.length}`);
console.log(`- JSON files parsed: ${jsonFiles.length}`);
console.log(`- Markdown files/link-scanned: ${mdFiles.length}`);
console.log(`- Adult example characters checked: ${characters.length}`);
