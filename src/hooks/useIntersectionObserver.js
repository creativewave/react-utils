
import IntersectionObserver from '../lib/intersectionObserver'
import React from 'react'
import log from '../lib/log'
import memoize from '../lib/memoize'
import noop from '../lib/noop'

let DEBUG

class IntersectionObserversCache {

    constructor() {
        this.observers = []
    }

    /**
     * get :: IntersectionObserverOptions -> IntersectionObserver
     */
    get(options) {
        const [observer] = this.observers.find(([, observerOptions]) =>
            Object
                .entries(observerOptions)
                .every(([key, value]) => options[key] === value)) || []
        return observer

    }

    /**
     * set :: (([IntersectionObserverEntry] -> IntersectionObserver -> void) -> IntersectionObserverOptions)
     *     -> IntersectionObserver
     */
    set(callback, options) {
        // eslint-disable-next-line compat/compat
        const observer = new IntersectionObserver(callback, options)
        this.observers.push([observer, options])
        return observer
    }

    /**
     * remove :: IntersectionObserver -> void
     */
    remove(observer) {
        this.observers = this.observers.filter(([o]) => o === observer ? observer.disconnect() : true)
    }
}
export const observers = new IntersectionObserversCache()

/**
 * handleIntersection :: Callbacks -> ([IntersectionObserverEntry] -> IntersectionObserver) -> void
 *
 * Callbacks => {
 *   onEnter?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   onExit?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 * }
 */
const handleIntersection = ({ onEnter, onExit }) => (entries, observer) =>
    entries.forEach(entry => {
        log('[use-intersection-observer]', DEBUG, entry, observer)
        entry.isIntersecting
            ? onEnter(entry, observer)
            : onExit(entry, observer)
    })

/**
 * useIntersectionObserver :: Configuration -> [CallbackRef, CallbackRef, IntersectionObserver]
 *
 * Configuration => {
 *   onEnter?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   onExit?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   rootMargin?: String,
 *   threshold?: Number,
 * }
 * CallbackRef :: Element?|null -> void
 *
 * It should use a single observer per unique set of options given as arguments.
 *
 * It should use a single callback for all observer instances.
 *
 * It should unobserve a target when its component unmouts.
 *
 * It should disconnect a root component when it unmounts.
 */
const useIntersectionObserver = ({
    debug = false,
    onEnter = noop,
    onExit = noop,
    rootMargin = '0px',
    threshold = 0,
} = {}) => {

    DEBUG = debug

    const observer = React.useRef()
    const root = React.useRef()
    const targets = React.useRef([])
    const setRoot = React.useCallback(
        node => {

            const options = { root: root.current, rootMargin, threshold }

            if (node === null) {
                // (1) Don't remove an observer set with document (aka. null) as root
                //     (it may be used by other components)
                // (2) Fix HMR error when root is unmounted AFTER a forced update
                //     (the effect below would trigger twice)
                if (/* (1) */ root.current !== null && root.current !== document && /* (2) */ observer.current) {
                    observers.remove(observer.current)
                }
                observer.current = root.current = undefined
                return
            } else if ((root.current === node && typeof node !== 'undefined')
                || (root.current === null && typeof node === 'undefined')) {
                return
            }

            options.root = root.current = node || null
            observer.current = observers.get(options)
                || observers.set(handleIntersection({ onEnter, onExit }), options)
            targets.current.forEach(([target]) => observer.current.observe(target))
        },
        [observer, onEnter, onExit, root, rootMargin, targets, threshold])
    const setTarget = React.useCallback(
        memoize(id => node => {
            if (node === null) {
                targets.current = targets.current.filter(([node, nodeId]) => {
                    if (nodeId !== id) {
                        return true
                    } else if (observer.current) {
                        observer.current.unobserve(node)
                    }
                    return false
                })
                return
            } else if (observer.current) {
                observer.current.observe(node)
            }
            targets.current.push([node, id])
        }),
        [observer, targets])

    return [setRoot, setTarget, observer]
}

export default useIntersectionObserver
