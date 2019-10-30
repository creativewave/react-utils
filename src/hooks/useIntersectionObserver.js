
import React from 'react'
import log from '../lib/log'
import noop from '../lib/noop'

class ObserversCache {

    constructor() {
        this.observers = []
    }

    /**
     * get :: IntersectionObserverOptions -> Observer
     */
    get(options) {
        const [observer] = this.observers.find(([, observerOptions]) =>
            Object
                .entries(observerOptions)
                .every(([key, value]) => options[key] === value)) || []
        return observer

    }

    /**
     * set :: (Entries -> Observer -> void) -> IntersectionObserverOptions -> Observer
     */
    set(callback, options) {
        // eslint-disable-next-line compat/compat
        const observer = new IntersectionObserver(callback, options)
        this.observers.push([observer, options])
        return observer
    }
}
const observers = new ObserversCache()
const callbacks = new Map()

let DEBUG

/**
 * handleIntersection :: ([Element] -> IntersectionObserver) -> void
 */
const handleIntersection = (entries, observer) =>
    entries.forEach(entry => {
        log('[use-intersection-observer]', DEBUG, entry, observer)
        callbacks.set(
            entry.target,
            callbacks
                .get(entry.target)
                .filter(({ onEnter, onExit, once }) => {
                    if (entry.isIntersecting) {
                        onEnter(entry, observer)
                        if (once) {
                            observer.unobserve(entry.target)
                            return false
                        }
                    } else {
                        onExit(entry, observer)
                    }
                    return true
                }))
    })

/**
 * useIntersectionObserver :: Configuration -> void
 *
 * Configuration => {
 *   onEnter?: (Entry -> IntersectionObserver) -> void,
 *   onExit?: (Entry -> IntersectionObserver) -> void,
 *   once?: Boolean,
 *   root?: Element,
 *   rootMargin?: String,
 *   targets?: [Element],
 *   threshold?: Number,
 * }
 *
 * It should use a single observer instance per unique set of options given as
 * arguments.
 *
 * It should use a single callback for all observer instances.
 *
 * It should register and execute either the `onEnter` or `onExit` callback
 * associated to each intersecting `HTMLElement`.
 *
 * It should unobserve a target element before the component unmouts.
 *
 * Memo: the observer is not automatically `disconnect`ed when it has no more
 * `targets` to observe, for performance reasons, as in most cases, there will
 * be just a few observers, which could be kept in memory.
 *
 * Memo: the observer will trigger `onEnter` or `onExit` after root did mount.
 *
 * TODO: prevent executing `onExit` on load.
 * TODO: return the observer to manually `unobserve` or `disconnect`.
 *
 * Memo: https://w3c.github.io/IntersectionObserver/#intersection-observer-init
 */
const useIntersectionObserver = ({
    debug = false,
    onEnter = noop,
    onExit = noop,
    once = false,
    root = null,
    rootMargin = '0px',
    targets = [],
    threshold = 0,
} = {}) => {

    DEBUG = debug

    React.useEffect(() => {

        if (!targets.length) return
        if (root !== null && typeof root !== 'object') return

        const options = { root, rootMargin, threshold }
        const observer = observers.get(options) || observers.set(handleIntersection, options)

        targets.forEach(target => {
            callbacks.set(target, (callbacks.get(target) || []).concat({ onEnter, onExit, once }))
            observer.observe(target)
        })

        return () => targets.forEach(ref => {
            observer.unobserve(ref)
            callbacks.set(
                ref,
                callbacks.get(ref).filter(params => !(
                    onEnter === params.onEnter
                    && onExit === params.onExit
                    && once === params.once)))
        })

    }, [onEnter, onExit, once, root, rootMargin, targets, threshold])
}

export default useIntersectionObserver
