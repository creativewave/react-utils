
const { dependencies } = require('./package.json')

const plugins = []
const presetEnv = {
    bugfixes: true,
    corejs: { proposals: true, version: dependencies['core-js'] },
    useBuiltIns: 'usage',
}
const presets = [['@babel/preset-env', presetEnv], ['@babel/preset-react']]

module.exports = api => {

    const env = api.env()

    if (env === 'browser') {
        presetEnv.targets = { esmodules: true }
        return { exclude: /core-js/, plugins, presets }
    }

    presetEnv.targets = { node: true }

    if (env === 'node') {
        plugins.push(['@babel/plugin-transform-runtime', { version: dependencies['@babel/runtime'] }])
        presetEnv.modules = false
    }

    return { exclude: /node_modules/, plugins, presets }
}
