
import babel from 'rollup-plugin-babel'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import pkg from './package.json'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'

const {
    dependencies = {},
    optionalDependencies = {},
    peerDependencies = {},
} = pkg

const pattern = `^(${Object.keys({
    ...dependencies,
    ...optionalDependencies,
    ...peerDependencies,
}).concat('prop-types').join('|')})`

const external = id => (new RegExp(pattern)).test(id)

const replaceEnv = replace({ 'process.env.NODE_ENV': process.env.NODE_ENV })

const getBabelConfig = targets => ({
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
        external,
        input: 'src/index.js',
        output: {
            file: pkg.main,
            format: 'cjs',
        },
        plugins: [replaceEnv, babel(getBabelConfig({ node: true }))],
    },
    {
        external,
        input: 'src/index.js',
        output: {
            file: pkg.module,
            format: 'es',
        },
        plugins: [replaceEnv, babel(getBabelConfig({ esmodules: true }))],
    },
    {
        input: 'src/index.js',
        output: {
            file: pkg.unpkg,
            format: 'iife',
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
