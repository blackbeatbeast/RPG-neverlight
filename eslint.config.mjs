import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/.wrangler/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/*.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{cjs,js,mjs,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports', prefer: 'type-imports' },
      ],
    },
  },
  prettier,
);
