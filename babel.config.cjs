
const { dependencies } = require('./package.json')
const presetEnv = { corejs: dependencies['core-js'], useBuiltIns: 'usage' }
const presets = [['@babel/preset-env', presetEnv], ['@babel/preset-react']]

module.exports = api => {

    const env = api.env()

    if (env === 'browser' || env === 'development') {
        presetEnv.targets = { esmodules: true }
    } else {
        presetEnv.targets = { node: true }
    }

    if (env === 'browser') {
        return { exclude: /core-js/, presets }
    }

    return { exclude: /node_modules/, presets }
}
