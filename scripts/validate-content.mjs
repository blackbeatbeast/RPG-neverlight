import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = process.argv[2] ?? path.join(root, 'content', 'examples', 'bundle.json');
const packagePath = path.join(root, 'packages', 'content-schema', 'dist', 'index.js');

const { canonicalContentJson, formatValidationIssues, validateContentBundle } = await import(
  pathToFileURL(packagePath).href
);
const relativeBundlePath = path.relative(root, bundlePath).replaceAll('\\', '/');
let input;

try {
  input = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
} catch (error) {
  console.error(`Content validation failed while reading ${relativeBundlePath}: ${error.message}`);
  process.exit(1);
}

const report = validateContentBundle(input);
if (!report.valid || !report.bundle) {
  console.error(`Content validation failed: ${relativeBundlePath}`);
  console.error(formatValidationIssues(report.errors));
  process.exit(1);
}

const isFirstRegion =
  report.bundle.contentVersion === '0.4.0' &&
  report.bundle.routes.some((route) => route.id === 'route.glass-marsh');
if (isFirstRegion) {
  const bossCount = report.bundle.nodes.filter((node) => node.type === 'boss').length;
  const suggestiveAssets = report.bundle.assets.filter((asset) => asset.audience === 'suggestive');
  const requiredCounts = [
    [report.bundle.characters.length >= 4, 'at least four adult characters'],
    [report.bundle.nodes.length >= 12, 'at least twelve reachable route nodes'],
    [report.bundle.enemies.length >= 7, 'at least six enemies and one boss'],
    [bossCount === 1, 'exactly one boss node'],
    [report.bundle.items.length >= 20, 'at least twenty item bases'],
    [report.bundle.affixes.length >= 20, 'at least twenty affixes'],
    [report.bundle.quests.length >= 1, 'at least one quest'],
    [report.bundle.dispatches.length >= 1, 'at least one dispatch'],
    [suggestiveAssets.length === 0, 'no suggestive assets in the internal bundle'],
  ];
  const failed = requiredCounts.filter(([condition]) => !condition).map(([, label]) => label);
  if (failed.length > 0) {
    console.error(`First-region acceptance failed: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log(
    `- first-region counts: ${report.bundle.characters.length} adult characters, ${report.bundle.nodes.length} nodes, ${report.bundle.enemies.length} enemies, ${report.bundle.items.length} items, ${report.bundle.affixes.length} affixes, ${report.bundle.quests.length} quests, ${report.bundle.dispatches.length} dispatches`,
  );
  console.log(`- suggestive assets: ${suggestiveAssets.length} (disabled)`);
}

const checksum = createHash('sha256')
  .update(canonicalContentJson(report.bundle), 'utf8')
  .digest('hex');
console.log(`Content validation passed: ${relativeBundlePath}`);
console.log(`- schemaVersion: ${report.bundle.schemaVersion}`);
console.log(`- contentVersion: ${report.bundle.contentVersion}`);
console.log(`- rulesetVersion: ${report.bundle.rulesetVersion}`);
console.log(`- checksum: sha256:${checksum}`);
console.log(
  `- definitions: ${Object.entries(report.bundle)
    .filter(([, value]) => Array.isArray(value))
    .reduce((total, [, value]) => total + value.length, 0)}`,
);
if (report.warnings.length > 0) {
  console.warn('Warnings:');
  console.warn(formatValidationIssues(report.warnings));
}
