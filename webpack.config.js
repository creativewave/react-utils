
module.exports = env => ({
    externals: {
        '@cdoublev/animate': 'animate',
        react: {
            root: 'React',
            commonjs2: 'react',
            commonjs: 'react',
            amd: 'react',
            umd: 'react',
        },
    },
    mode: env,
    module: { rules: [{ exclude: /node_modules/, test: /\.jsx?$/, use: 'babel-loader' }] },
    output: {
        library: 'ReactUtils',
        libraryTarget: 'umd'
    },
})
