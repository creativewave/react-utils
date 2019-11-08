
import React from 'react'
import log from '../lib/log'
import noop from '../lib/noop'
import { universalDocument } from '../lib/universal'

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
}
const observers = new IntersectionObserversCache()

/**
 * handleIntersection :: (Targets -> Callbacks) -> ([IntersectionObserverEntry] -> IntersectionObserver) -> void
 *
 * Targets => { current: [Element] }
 * Callbacks => {
 *   onEnter?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   onExit?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   once?: Boolean,
 * }
 */
const handleIntersection = (targets, { onEnter, onExit, once }) => (entries, observer) =>
    entries.forEach(entry => {
        log('[use-intersection-observer]', DEBUG, entry, observer)
        if (entry.isIntersecting) {
            onEnter(entry, observer)
            if (once) {
                observer.unobserve(entry.target)
                targets.current = targets.current.filter(([target]) => target !== entry.target)
            }
        } else {
            onExit(entry, observer)
        }
    })

/**
 * useIntersectionObserver :: Configuration -> [CallbackRef, CallbackRef]
 *
 * Configuration => {
 *   onEnter?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   onExit?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   once?: Boolean,
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
    rootMargin = '0px',
    threshold = 0,
} = {}) => {

    DEBUG = debug

    const root = React.useRef()
    const targets = React.useRef([])
    const setRoot = React.useCallback(
        node => {

            const options = { root: root.current, rootMargin, threshold }

            if (node === null && typeof root.current !== 'undefined') {

                observers.get(options).disconnect()
                targets.current = []
                root.current = undefined

                return
            } else if (node === root.current) {
                return
            } else if (targets.current.length === 0) {
                return
            }
            root.current = node || universalDocument

            const observer = observers.get(options)
                || observers.set(handleIntersection(targets, { onEnter, onExit, once }), options)

            targets.current.forEach(([target]) => observer.observe(target))
        },
        [onEnter, onExit, once, root, rootMargin, targets, threshold])
    const setTarget = React.useCallback(
        id => node => {
            if (node === null) {
                targets.current = targets.current.filter(([node, nodeId]) => {
                    if (nodeId !== id) {
                        return false
                    }
                    const observer = observers.get({ root: root.current, rootMargin, threshold })
                    if (observer) {
                        observer.unobserve(node)
                    }
                    return true
                })
                return
            }
            targets.current.push([node, id])
        },
        [root, rootMargin, targets, threshold])

    return [setRoot, setTarget]
}

export default useIntersectionObserver
