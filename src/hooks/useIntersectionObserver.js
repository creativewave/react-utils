
import IntersectionObserver from '../lib/intersectionObserver.js'
import React from 'react'
import log from '../lib/log.js'
import memoize from '../lib/memoize.js'
import noop from '../lib/noop.js'

let DEBUG

/**
 * ExtendedIntersectionObserver
 *
 * Targets => Map { [Element]: Callbacks }
 * Callbacks => { onEnter: [Callback], onExit: [Callback] }
 *
 * It should set a map between an `Element` and its `Callbacks` when observing
 * it, in order to use a single observer with multiple intersection callbacks,
 * and assign this map to the `targets` property of the decorated observer.
 *
 * It should delete the given `Callback`(s) associated to an `Element` when
 * unobserving it.
 *
 * Memo: Babel is not able to transpile an extension of `IntersectionObserver`
 * for the UMD build (ES5), and it only has a few methods to handle, therefore
 * a decorator is used in place of inheritance.
 */
export class ExtendedIntersectionObserver {

    constructor(callback, options) {
        this.observer = new IntersectionObserver(callback, options)
        this.observer.targets = new Map()
    }

    disconnect() {
        this.observer.disconnect()
    }

    /**
     * observe :: (Element -> { onEnter: Callback, onExit: Callback }) -> void
     */
    observe(target, { onEnter, onExit }) {

        if (!this.observer.targets.has(target)) {
            this.observer.targets.set(target, { onEnter: new Set(), onExit: new Set() })
        }

        const callbacks = this.observer.targets.get(target)

        if (typeof onEnter === 'function') {
            callbacks.onEnter.add(onEnter)
        }
        if (typeof onExit === 'function') {
            callbacks.onExit.add(onExit)
        }

        this.observer.observe(target)
    }

    /**
     * unobserve :: (Element -> { onEnter: Callback, onExit: Callback }) -> void
     */
    unobserve(target, { onEnter, onExit }) {

        const callbacks = this.observer.targets.get(target)

        callbacks.onEnter.delete(onEnter)
        callbacks.onExit.delete(onExit)

        this.observer.unobserve(target)
    }
}

/**
 * IntersectionObserversCache
 *
 * It should set and get a single instance per `IntersectionObserverOptions`.
 *
 * It should disconnect an observer before removing it from its cache.
 *
 * It should provide a `clear()` interface to remove observer instances after
 * each test case that uses document as root, whose observer will not be removed
 * on unmount.
 */
class IntersectionObserversCache {

    constructor() {
        this.observers = []
    }

    /**
     * clear :: void -> void
     */
    clear() {
        this.observers = []
    }

    /**
     * get :: IntersectionObserverOptions -> ExtendedIntersectionObserver|void
     */
    get(options) {

        const [observer] = this.observers.find(([, observerOptions]) =>
            Object
                .entries(observerOptions)
                .every(([key, value]) => options[key] === value)) ?? []

        return observer
    }

    /**
     * set :: IntersectionObserverOptions -> ExtendedIntersectionObserver
     */
    set(options) {

        const observer = new ExtendedIntersectionObserver(
            (entries, observer) =>
                entries.forEach(entry => {

                    log('[use-intersection-observer]', DEBUG, entry, observer)

                    const callbacks = observer.targets.get(entry.target)

                    entry.isIntersecting && (entry.intersectionRatio > 0 || 1 == options.threshold)
                        ? callbacks.onEnter.forEach(onEnter => onEnter(entry, observer))
                        : callbacks.onExit.forEach(onExit => onExit(entry, observer))
                }),
            options)

        this.observers.push([observer, options])

        return observer
    }

    /**
     * remove :: ExtendedIntersectionObserver -> void
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
                /**
                 * Don't remove an observer that has document (null) as root
                 * (it may be used by other components)
                 */
                if (root.current === null) {
                    targets.current.forEach(([target]) => observer.current.unobserve(target, { onEnter, onExit }))
                } else {
                    observers.remove(observer.current)
                }
                observer.current = root.current = undefined
                return
            } else if (observer.current) {
                return
            }

            /**
             * Handle `setRoot(document)` (root requires Element|null)
             * Handle `setRoot()` (undefined -> null)
             */
            options.root = root.current = node === document ? null : (node ?? null)
            observer.current = observers.get(options) ?? observers.set(options)
            targets.current.forEach(([target]) => observer.current.observe(target, { onEnter, onExit }))
        },
        [observer, onEnter, onExit, root, rootMargin, targets, threshold])
    /* eslint-disable react-hooks/exhaustive-deps */
    const setTarget = React.useCallback(
        memoize(id => node => {
            if (node === null) {
                targets.current = targets.current.filter(([node, nodeId]) => {
                    if (nodeId !== id) return true
                    observer.current?.unobserve(node, { onEnter, onExit })
                    return false
                })
                return
            }
            observer.current?.observe(node, { onEnter, onExit })
            targets.current.push([node, id])
        }),
        [observer, onEnter, onExit, targets])
    /* eslint-enable react-hooks/exhaustive-deps */

    return [setRoot, setTarget, observer]
}

export default useIntersectionObserver
