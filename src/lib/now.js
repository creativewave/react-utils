/* eslint-disable no-undef */

const now = process.env.NODE_ENV === 'test'
    ? require('perf_hooks').performance.now
    : () => performance.now()

export default now
