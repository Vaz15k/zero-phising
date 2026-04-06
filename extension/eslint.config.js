import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    {
        ignores: ['.output/**', '.wxt/**', 'node_modules/**'],
    },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsparser,
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'react-hooks': reactHooks,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': 'error',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
];