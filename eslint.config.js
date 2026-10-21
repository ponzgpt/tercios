import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  { languageOptions: { globals: globals.browser } },
  {
    // El core es puro: sin DOM ni reloj del sistema.
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Inyecta el tiempo en src/core.' },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'performance'],
    },
  },
  prettier,
);
