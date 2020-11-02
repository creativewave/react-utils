
// Users should polyfill themselves the following interfaces.
const notPolyfilled = [
    'IntersectionObserver',
    'Object',
    'performance',
]

module.exports = {
    extends: ['@cdoublev/eslint-config', '@cdoublev/eslint-config/react'],
    overrides: [
        {
            extends: ['@cdoublev/eslint-config/node', '@cdoublev/eslint-config/jest'],
            files: ['__tests__/**/*.js'],
            globals: {
                Element: 'readonly',
                Event: 'readonly',
                MouseEvent: 'readonly',
                TouchEvent: 'readonly',
                WheelEvent: 'readonly',
                document: 'readonly',
            },
        },
        {
            extends: ['@cdoublev/eslint-config/browser'],
            files: ['src/**/*.js'],
            settings: {
                polyfills: notPolyfilled,
            },
        },
    ],
    parser: '@babel/eslint-parser',
    rules: {
        "react/react-in-jsx-scope": "off",
    },
}
