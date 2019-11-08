
/**
 * memoize :: fn -> a
 */
const memoize = fn => {
    const memoized = (...args) => {
        if (memoized.cache.has(args[0])) {
            return memoized.cache.get(args[0])
        }
        const result = fn(...args)
        memoized.cache.set(args[0], result)
        return result
    }
    memoized.cache = new Map()
    return memoized
}

export default memoize
