
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import pkg from './package.json'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'

const browserExternals = Object.keys({
    ...pkg.optionalDependencies,
    ...pkg.peerDependencies,
}).concat('prop-types')
const buildExternals = browserExternals.concat(Object.keys(pkg.dependencies))
const buildExternalRegexp = new RegExp(`^(${buildExternals.join('|')})`)
const browserExternalRegexp = new RegExp(`^(${browserExternals.join('|')})`)

const replaceEnv = replace({ 'process.env.NODE_ENV': process.env.NODE_ENV })

const getBabelConfig = targets => ({
    babelHelpers: 'bundled',
    exclude: /node_modules/,
    presets: [
        ['@babel/preset-env', {
            corejs: 3,
            // debug: true,
            targets,
            useBuiltIns: 'usage',
        }],
        '@babel/preset-react',
    ]
})

export default [
    {
        external: id => buildExternalRegexp.test(id),
        input: 'src/index.js',
        output: {
            file: pkg.module,
            format: 'es',
        },
        plugins: [replaceEnv, babel(getBabelConfig({ esmodules: true }))],
    },
    {
        external: id => browserExternalRegexp.test(id),
        input: 'src/index.js',
        output: {
            file: pkg.unpkg,
            format: 'umd',
            globals: {
                '@cdoublev/animate': 'animate',
                'prop-types': 'PropTypes',
                'react': 'React',
                'react-dom': 'ReactDOM',
            },
            name: 'ReactUtils',
        },
        plugins: [
            replaceEnv,
            nodeResolve(),
            babel(getBabelConfig('defaults')),
            commonjs(),
            terser(),
        ],
    },
]
