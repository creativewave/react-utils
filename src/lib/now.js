/* eslint-disable no-undef, compat/compat */

const now = process.env.NODE_ENV === 'test'
    ? require('perf_hooks').performance.now
    : () => performance.now()

export default now
