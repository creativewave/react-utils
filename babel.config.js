/**
 * Babel configuration (transpilation and polyfilling)
 *
 * This is a set of conventions to configure Babel via `process.env` variables.
 *
 * `BABEL_ENV` should define the `modules` system that should be used in files
 * outputed by Babel: `cjs` or `es`.
 * `cjs` means that Babel should transform all ES modules `import` and `export`
 * statements to their CommonJS equivalents.
 * `es` is currently associated with `esmodules` for `targets` (more below).
 * `undefined`, `false` or `'auto'` means that a bundler should transform them
 * using the syntax of the module system defined in its own configuration.
 *
 * `NODE_ENV` should define the processing context.
 * Until ESModules are stable in NodeJS, `test` means that Babel should output
 * files transpiled for the current NodeJS version, before being processed by a
 * testing framework.
 * `undefined` means that they will be consumed by an application (more below).
 * Other values might be `development` or `production`, eventually prefixed with
 * `server/` or `client/`. With `client/`, Babel should output files transpiled
 * for the corresponding `browsers` targets defined in `package.json`, and with
 * `server`, for the NodeJS version that will run the application.
 *
 * When `targets` is `esmodules`, Babel transpiles for a set of browsers which
 * are supporting ES Modules. Ideally, a package shouldn't be transpilled when
 * it's consumed by another package or an application. Both should resolve its
 * path using its `module` field in `package.json` (instead of the `main` field
 * corresponding to the `cjs` version), and bundle it using their own targets.
 * But this can't be easily achieved yet: all `node_modules` would need to be
 * compiled or the author should include/exclude modules to transpile or not.
 *
 * Related:
 * - https://webpack.js.org/guides/author-libraries/#final-steps
 * - https://babeljs.io/blog/2018/06/26/on-consuming-and-publishing-es2015+-packages
 * - https://philipwalton.com/articles/deploying-es2015-code-in-production-today/
 */
const { BABEL_ENV, NODE_ENV } = process.env
const modules = (BABEL_ENV === 'cjs' || NODE_ENV === 'test') ? 'cjs' : false
const targets = NODE_ENV === 'test' ? { node: true } : BABEL_ENV === 'es' ? { esmodules: true } : undefined
const { corejs, useBuiltIns } = BABEL_ENV === 'es' ? {} : { corejs: 3, useBuiltIns: 'usage' }

module.exports = {
    presets: [
        ['@babel/preset-env', { corejs, modules, targets, useBuiltIns }],
        "@babel/preset-react",
    ],
}
