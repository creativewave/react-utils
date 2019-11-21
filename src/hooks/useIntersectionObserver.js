
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
        this.observers = this.observers.filter(o => o !== observer)
    }
}
const observers = new IntersectionObserversCache()

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

    const didMount = React.useRef(false)
    const observer = React.useRef()
    const root = React.useRef()
    const targets = React.useRef([])
    const setRoot = React.useCallback(
        node => {

            const options = { root: root.current, rootMargin, threshold }

            if (node === null) {
                // (1) Fix HMR with root being unmounted after a forced update and its effect below
                if (!observer.current) {
                    return
                }
                // (2) Don't disconnect an observer set with document (null) as root
                // (it may be used by other components)
                if (root.current !== null) {
                    observer.current.disconnect()
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

    React.useEffect(
        () => {
            // Only re-initialize on update
            if (!didMount.current) {
                didMount.current = true
                return
            // Cleanup only if an observer exists
            } else if (observer.current) {
                // Don't disconnect an observer set with document (null) as root
                // (it may be used by other components)
                if (root.current === null) {
                    observer.current = undefined
                } else {
                    setRoot(null)
                }
            }
            setRoot(root.current)
        },
        [didMount, observer, root, setRoot])

    return [setRoot, setTarget, observer]
}

export default useIntersectionObserver
