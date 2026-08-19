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
