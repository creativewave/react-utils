
module.exports = {
    exclude: /node_modules/,
    presets: [
        ['@babel/preset-env', {
            corejs: '3.8',
            targets: { node: 'current' },
            useBuiltIns: 'usage',
        }],
        ['@babel/preset-react'],
    ],
}
