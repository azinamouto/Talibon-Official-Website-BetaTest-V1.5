import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['src/**/*.ts'],
  languageOptions: { parser: tseslint.parser },
  plugins: { '@typescript-eslint': tseslint.plugin },
  rules: {
    'constructor-super': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': 'error',
    'no-duplicate-case': 'error',
    'no-async-promise-executor': 'error',
    '@typescript-eslint/no-duplicate-enum-values': 'error',
  },
});
