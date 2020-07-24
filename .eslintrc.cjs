
// Users should polyfill themselves the following interfaces.
const notPolyfilled = [
    'IntersectionObserver',
    'TouchEvent',
    'WheelEvent',
]

module.exports = {
    extends: ['@cdoublev/eslint-config/react', '@cdoublev/eslint-config/jest'],
    settings: {
        polyfills: [
            'Object',
            ...notPolyfilled,
        ],
    },
}
