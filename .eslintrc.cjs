
// Users should polyfill themselves the following interfaces.
const notPolyfilled = [
    'IntersectionObserver',
    'TouchEvent',
    'WheelEvent',
]

module.exports = {
    env: { jest: true },
    extends: ['@cdoublev/eslint-config/react'],
    settings: {
        polyfills: [
            'Object',
            ...notPolyfilled,
        ],
    },
}
