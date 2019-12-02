
import React from 'react'
import { universalDocument as document } from '../lib/universal'
import log from '../lib/log'
import memoize from '../lib/memoize'
import noop from '../lib/noop'
import useIntersectionObserver from './useIntersectionObserver'

/**
 * getScrollDirection :: (Event -> Position?) -> [Number, String]
 *
 * Position => { x: Number, y: Number }
 *
 * It should return scroll direction as a `Number` (raw value) and as a `String`
 * (up, down, left, or right).
 *
 * TODO (better handle wheel events):
 * https://github.com/Promo/wheel-indicator/blob/master/lib/wheel-indicator.js#L109
 */
const getScrollDirection = (event, previousTouch = {}) => {

    const move = event.type === 'touchmove'
        ? {
            x: previousTouch.x - event.touches[0].clientX,
            y: previousTouch.y - event.touches[0].clientY,
        }
        : { x: event.deltaX, y: event.deltaY }

    if (event.type === 'touchmove' && (Math.abs(move.x) + Math.abs(move.y)) < 150) return 0

    return Math.abs(move.x) > Math.abs(move.y)
        ? move.x > 0 ? [1, 'right'] : [-1, 'left']
        : move.y > 0 ? [1, 'down'] : [-1, 'up']
}

/**
 * addEventListeners :: (Element -> (Event -> (void -> void)|void) -> { current: Boolean }) -> (void -> void)
 */
const addEventListeners = (root, onScroll, isScrolling) => {

    let cancelTimers
    let firstTouch
    let isPointerDown

    const onWheel = event => {
        if (isPointerDown && event.type !== 'touchmove') {
            return
        } else if (!isScrolling.current) {
            cancelTimers = onScroll(event, firstTouch)
            if (!cancelTimers) {
                return
            }
            isScrolling.current = true
        }
        event.preventDefault()
        return event.returnValue = false
    }
    const onPointerDown = () => isPointerDown = true
    const onPointerUp = () => isPointerDown = false
    const onTouchStart = event => firstTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY }

    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointerup', onPointerUp)
    root.addEventListener('touchstart', onTouchStart)
    root.addEventListener('touchmove', onWheel, { passive: false })
    root.addEventListener('wheel', onWheel, { passive: false })

    return () => {
        cancelTimers && cancelTimers()
        root.removeEventListener('pointerdown', onPointerDown)
        root.removeEventListener('pointerup', onPointerUp)
        root.removeEventListener('touchstart', onTouchStart)
        root.removeEventListener('touchmove', onWheel, { passive: false })
        root.removeEventListener('wheel', onWheel, { passive: false })
    }
}

/**
 * useScrollIntoView :: Configuration -> [CallbackRef, CallbackRef, IntersectionObserver]
 *
 * Configuration => {
 *   beforeScroll?: (Number -> Number -> String) -> Number|void,
 *   debug?: Boolean,
 *   delay?: Number,
 *   mode?: String,
 *   onEnter?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   onExit?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   rootMargin?: String,
 *   threshold?: Number,
 *   wait?: Number,
 * }
 * CallbackRef :: Element?|null -> void
 *
 * It should prevent scrolling an `Element` into view on `pointerdown`, ie. when
 * a mouse button is pressed (including `mousedown`), or when a physical contact
 * (finger or stylus) is made with the digitizer (including `touchstart` but not
 * `touchmove` or `pointermove`), until `pointerup`.
 *
 * It should execute `beforeScroll` before scrolling, giving it a chance to set
 * the `Element` to scroll into view, otherwise it should scroll into view the
 * `Element` before or after the current one depending on the `wheel` or "swipe"
 * (`touchstart`, `touchmove`, `touchend`) event direction.
 *
 * It should delay scrolling into view with the given `delay`, ie. it should
 * execute `beforeScroll`, wait, then scroll into view.
 *
 * It should throttle scrolling into view with the given `wait`, ie. it should
 * scroll into view, then wait while ignoring any consecutive scroll event, then
 * listen for a new scroll event.
 *
 * Memo: `scroll` is triggered by the user agent after a `wheel` or `touchmove`
 * (+ `touchstart`) event and is defined/executed using their own implementation
 * (eg. Chrome uses a delay before scrolling) as well as the pointing device
 * features (eg. acceleration).
 *
 * Memo: conceptualize the sequence of target indexes as a serie of numbers like
 * `|-1  0 1 2 3  4|`, where -1 and 4 represents a state without a target in
 * view, and 0 to 3 represent the state of the current target index in view.
 */
const useScrollIntoView = ({
    beforeScroll = noop,
    debug,
    delay = 200,
    mode = 'smooth',
    onEnter = noop,
    onExit,
    rootMargin,
    threshold = 1,
    wait = 1000,
} = {}) => {

    const cleanup = React.useRef(noop)
    const isScrolling = React.useRef(false)
    const root = React.useRef()
    const target = React.useRef(-1)
    const targets = React.useRef([])

    const setCurrentTarget = React.useCallback(index => target.current = index, [])
    const handleEnter = React.useCallback(
        entry => {
            setCurrentTarget(targets.current.findIndex(([, node]) => node === entry.target))
            onEnter(entry)
        },
        [onEnter, setCurrentTarget, targets])
    const [setObserverRoot, setObserverTarget, observer] = useIntersectionObserver({
        debug,
        onEnter: handleEnter,
        onExit,
        rootMargin,
        threshold,
    })

    const setRoot = React.useCallback(
        node => {

            setObserverRoot(node)

            if (node === null) {
                cleanup.current()
                cleanup.current = noop
                root.current = undefined
                return
            } else if ((root.current === node && typeof node !== 'undefined')
                || (root.current === null && typeof node === 'undefined')) {
                return
            }

            const onScroll = (event, firstTouch) => {

                const [direction, alias] = getScrollDirection(event, firstTouch)

                const nextIndex = target.current + direction
                const userNextIndex = beforeScroll(nextIndex, target.current, alias)
                const scrollTarget = (targets.current[userNextIndex] && targets.current[userNextIndex][1])
                    || (targets.current[nextIndex] && targets.current[nextIndex][1])

                log('[use-scroll-into-view]', debug, {
                    currentIndex: target.current,
                    direction: `${alias} (${direction})`,
                    nextIndex,
                    target: scrollTarget,
                    userNextIndex,
                    event, // eslint-disable-line sort-keys
                })

                if (!scrollTarget) {

                    const { clientHeight, scrollHeight, scrollTop } =
                        root.current === document
                            ? root.current.body
                            : root.current

                    if (direction < 0 && scrollTop === 0) return
                    if (direction > 0 && scrollTop + clientHeight === scrollHeight) return

                    setCurrentTarget(direction > 0 ? targets.current.length : -1)
                    isScrolling.current = false

                    return
                }

                const scrollTimerId = setTimeout(() => scrollTarget.scrollIntoView({ behavior: mode }), delay)
                const throttleTimerId = setTimeout(() => isScrolling.current = false, wait)

                return () => {
                    clearTimeout(scrollTimerId)
                    clearTimeout(throttleTimerId)
                }
            }
            cleanup.current = addEventListeners(root.current = node || document, onScroll, isScrolling)
        },
        [
            beforeScroll,
            debug,
            delay,
            directions,
            isScrolling,
            mode,
            root,
            setCurrentTarget,
            setObserverRoot,
            target,
            targets,
            wait,
        ])
    const setTarget = React.useCallback(
        memoize(id => node => {

            targets.current.push([id, node])
            setObserverTarget(id)(node)

            if (node === null) {
                targets.current = targets.current.filter(([, node]) => node === null)
                return
            }
        }),
        [setObserverTarget, targets])

    return [setRoot, setTarget, observer]
}

export default useScrollIntoView
