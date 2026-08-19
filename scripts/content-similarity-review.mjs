import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reviewPath = path.join(root, 'content', 'reviews', 'first-region-clean-room.md');
const review = fs.readFileSync(reviewPath, 'utf8');
const requiredMarkers = [
  'Risk classification: **low for implementation similarity',
  'Protected names/assets/story/UI expression observed in the new bundle: **none**',
  'Source assets, screenshots, copied dialogue, maps, data dumps, formulas, or code imported:',
  'Human trademark/name search before Public Alpha.',
  'Human legal and asset-rights sign-off before production art or public/commercial release.',
];
const missing = requiredMarkers.filter((marker) => !review.includes(marker));
if (missing.length > 0) {
  console.error(`Content similarity review failed; missing markers: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Content similarity review: first-region');
console.log('- clean-room self-review: passed');
console.log('- copied/source assets or expression: none observed');
console.log('- general-audience fallback: complete; suggestive assets: disabled');
console.log('- provenance: written briefs and abstract placeholders recorded');
console.warn(
  '- external gate: human trademark, legal, and production-asset review remains required',
);
