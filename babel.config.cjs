
const { dependencies } = require('./package.json')

const plugins = []
const presetEnv = {
    bugfixes: true,
    corejs: dependencies['core-js'],
    useBuiltIns: 'usage',
}
const presets = [['@babel/preset-env', presetEnv], ['@babel/preset-react']]

module.exports = api => {

    const env = api.env()

    if (env === 'cjs' || env === 'es') {
        plugins.push(['@babel/plugin-transform-runtime', { version: dependencies['@babel/runtime'] }])
        presetEnv.modules = env === 'es' ? false : 'auto'
    } else if (env === 'umd') {
        presetEnv.targets = { esmodules: true }
        return { exclude: /core-js/, plugins, presets }
    }

    presetEnv.targets = { node: true }

    return { exclude: /node_modules/, plugins, presets }
}
