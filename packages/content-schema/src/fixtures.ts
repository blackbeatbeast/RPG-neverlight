import type { ContentBundle } from './index.js';

export const validFoundationFixture = {
  contentVersion: '0.1.0',
  entries: [
    {
      id: 'foundation-status',
      kind: 'foundation-note',
      text: 'Foundation content is ready for future packets.',
    },
  ],
  schemaVersion: 1,
} satisfies ContentBundle;

export const invalidFoundationFixture: unknown = {
  contentVersion: 'not-a-version',
  entries: [
    {
      id: 'Foundation Status',
      kind: 'foundation-note',
      text: '',
    },
  ],
  schemaVersion: 2,
};
