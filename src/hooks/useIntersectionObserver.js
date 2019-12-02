
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
     * clear :: void -> void
     *
     * Memo: it resets observers property to its initial value, as a cleanup
     * function to execute after each test case.
     */
    clear() {
        this.observers = []
    }

    /**
     * get :: IntersectionObserverOptions -> IntersectionObserver|void
     */
    get(options) {

        const [observer] = this.observers.find(([, observerOptions]) =>
            Object
                .entries(observerOptions)
                .every(([key, value]) => options[key] === value)) || []

        return observer
    }

    /**
     * set :: {
     *   onEnter: IntersectionObserverCallback,
     *   onExit: IntersectionObserverCallback,
     *   ...IntersectionObserverOptions,
     * }
     * -> IntersectionObserver
     *
     * IntersectionObserverCallback :: (IntersectionObserverEntry -> IntersectionObserver) -> void
     */
    set(options) {

        const { onEnter, onExit, ...observerOptions } = options
        const observer = new IntersectionObserver( // eslint-disable-line compat/compat
            (entries, observer) =>
                entries.forEach(entry => {
                    log('[use-intersection-observer]', DEBUG, entry, observer)
                    entry.isIntersecting
                        ? onEnter(entry, observer)
                        : onExit(entry, observer)
                }),
            observerOptions)

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
 * It should use a single observer per unique set of intersectin's callbacks and
 * observer options given as arguments, by using them as a key to get instances
 * from `IntersectionObserverOptions`, ie. the cache handler.
 *
 * TODO: add unit tests for above expectation.
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

            const options = { onEnter, onExit, root: root.current, rootMargin, threshold }

            if (node === null) {
                // Don't remove an observer that has document (null) as root
                // (it may be used by other components)
                if (root.current === null) {
                    targets.current.forEach(([target]) => observer.current.unobserve(target))
                } else {
                    observers.remove(observer.current)
                }
                observer.current = root.current = undefined
                return
            } else if (observer.current) {
                return
            }

            // Handle `setRoot(document)` (root requires Element|null)
            // Handle `setRoot()` (undefined -> null)
            options.root = root.current = node === document ? null : (node || null)
            observer.current = observers.get(options) || observers.set(options)
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
