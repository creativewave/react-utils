
import React from 'react'
import { universalDocument as document } from '../lib/universal'
import log from '../lib/log'
import memoize from '../lib/memoize'
import noop from '../lib/noop'
import useIntersectionObserver from './useIntersectionObserver'

/**
 * The distance in pixels that a finger or stylus should move to be handled as a
 * scroll event.
 */
export const TOUCH_SENSITIVITY = 150
/**
 * The `MouseEvent` and `PointerEvent` (inherits `MouseEvent`) property id for
 * the left button of a mouse, the finger, or a stylus.
 */
export const LEFT_BUTTON_ID = 0
export const TOUCH_BUTTON_ID = LEFT_BUTTON_ID
/**
 * The `MouseEvent` property id for the middle (wheel) button of a mouse.
 */
export const WHEEL_BUTTON_ID = 1

/**
 * getScrollDirection :: (WheelEvent|PointerEvent -> Touch?) -> [Number, String]
 *
 * It should compute the scroll direction given either a single `WheelEvent` or
 * a pair of a `PointerEvent` and a `TouchEvent`.
 *
 * It should return scroll direction as a signed binary `Number` (-1, 0, +1) and
 * as a `String` (up, down, left, or right).
 *
 * TODO (better handle wheel events):
 * https://github.com/Promo/wheel-indicator/blob/master/lib/wheel-indicator.js#L109
 */
const getScrollDirection = (event, previousTouch = {}) => {

    const move = { x: 0, y: 0 }

    if (event.type === 'wheel') {

        move.x = event.deltaX
        move.y = event.deltaY

    } else {

        const [currentTouch] = event.touches

        move.x = previousTouch.screenX - currentTouch.screenX
        move.y = previousTouch.screenY - currentTouch.screenY
    }

    if (event.type === 'touchmove' && (Math.abs(move.x) + Math.abs(move.y)) < TOUCH_SENSITIVITY) {

        return [0, 'static']
    }

    return Math.abs(move.x) > Math.abs(move.y)
        ? move.x > 0 ? [1, 'right'] : [-1, 'left']
        : move.y > 0 ? [1, 'down'] : [-1, 'up']
}

/**
 * addEventListeners :: (Element -> (Event -> (void -> void)|void) -> { current: Boolean }) -> (void -> void)
 *
 * (1) It should prevent the default UA handler (scroll) on `touchmove`, since
 * doing it on `pointermove` doesn't seem to work in Chrome Dev Tools, and it
 * would be far less performant (active listener on each mouse move).
 *
 * (2) It should prevent the default UA handler (pointerdown, scroll) on
 * `pointerdown` with a mouse that has its middle (wheel) button pressed down,
 * for the same reason as described in (1).
 *
 * Memo: (2) also prevents the default "Open link in new tab" behavior.
 *
 * TODO: search for an "escape" to the side effect described above.
 */
const addEventListeners = (root, onScroll, isScrolling) => {

    let cancelTimers
    let firstTouch

    /**
     * onWheel :: WheelEvent|TouchEvent -> false|void
     */
    const onWheel = event => {
        if (!isScrolling.current) {
            cancelTimers = onScroll(event, firstTouch)
            if (!cancelTimers) {
                // No target to scroll into view: return control to UA
                return
            }
            isScrolling.current = true
        }
        // Target found to scroll into view: prevent current and incoming events
        // to be handled by UA
        event.preventDefault()
        return event.returnValue = false
    }
    /**
     * onPointerDown :: PointerEvent -> false|void
     */
    const onPointerDown = event => {
        if (event.button === WHEEL_BUTTON_ID) {
            event.preventDefault()
            return event.returnValue = false
        } else if (event.pointerType === 'mouse') {
            return
        }
        firstTouch = event
    }
    const onPointerUp = () => firstTouch = null

    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointerup', onPointerUp)
    root.addEventListener('touchmove', onWheel, { passive: false }) // (1)
    root.addEventListener('wheel', onWheel, { passive: false })

    return () => {
        cancelTimers && cancelTimers()
        root.removeEventListener('pointerdown', onPointerDown)
        root.removeEventListener('pointerup', onPointerUp)
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
 *   directions?: String,
 *   mode?: String,
 *   onEnter?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   onExit?: (IntersectionObserverEntry -> IntersectionObserver) -> void,
 *   rootMargin?: String,
 *   threshold?: Number,
 *   wait?: Number,
 * }
 * CallbackRef :: Element?|null -> void
 *
 * It should scroll a previous/next `Element` into view (if any) on `wheel` or
 * on `touchmove` if `pointerdown` was not fired over the scrollbar.
 *
 * TODO: try to find a simple way to fix "not over the scrollbar".
 *
 * It should prevent default UA handler (scroll) on `mousedown` if the middle
 * button of the mouse is down.
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
    directions = 'both',
    mode = 'smooth',
    onEnter = noop,
    onExit = noop,
    rootMargin,
    threshold = 1,
    wait = 1000,
} = {}) => {

    const cleanup = React.useRef(noop)
    const isScrolling = React.useRef(false)
    const next = React.useRef()
    const root = React.useRef()
    const prev = React.useRef()
    const target = React.useRef(-1)
    const targets = React.useRef([])

    const setCurrentTarget = React.useCallback(index => target.current = index, [])
    const handleEnter = React.useCallback(
        entry => {
            if (isScrolling.current
                && targets.current[next.current]
                && targets.current[next.current][1] !== entry.target) {
                return
            }
            setCurrentTarget(targets.current.findIndex(([, node]) => node === entry.target))
            onEnter(entry)
        },
        [isScrolling, next, onEnter, setCurrentTarget, targets])
    const handleExit = React.useCallback(
        entry => {
            // (1) Prevent exit from first/last target when scrolling above/below them.
            // (2) Prevent exit from targets between current and next targets
            if (next.current < 0 || next.current >= targets.length) {
                return
            } else if (
                isScrolling.current
                && targets.current[prev.current]
                && targets.current[prev.current][1] !== entry.target) {
                return
            }
            onExit(entry)
        },
        [isScrolling, onExit, prev, targets])
    const [setObserverRoot, setObserverTarget, observer] = useIntersectionObserver({
        debug,
        onEnter: handleEnter,
        onExit: handleExit,
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

            /**
             * onScroll :: (Event -> Position) -> (void -> void)|void
             *
             * (1) It should prevent default UA behavior until a touch move has
             * reached a minimal distance to handle it as a scroll event.
             *
             * (2) It should abort if the user is scrolling to a direction that
             * is not watched for.
             *
             * (3) It should abort if the user is scrolling up while the current
             * target is the first target, or down while the current target is
             * the last target, to avoid a "static" scroll, ie. from a position
             * into the same position.
             */
            const onScroll = (event, firstTouch) => {

                const [direction, alias] = getScrollDirection(event, firstTouch)

                // (1)
                if (direction === 0) {
                    event.preventDefault()
                    event.returnValue = false
                    return
                }

                // (2)
                if ((directions === 'x' && ['down', 'up'].includes(alias))
                    || (directions === 'y' && ['left', 'right'].includes(alias))) {
                    isScrolling.current = false
                    return
                }

                const nextIndex = target.current + direction
                const userNextIndex = beforeScroll(nextIndex, target.current, alias)

                next.current = targets.current[userNextIndex] ? userNextIndex : nextIndex
                prev.current = target.current

                const nextTarget = targets.current[next.current] && targets.current[next.current][1]

                log('[use-scroll-into-view]', debug, {
                    currentIndex: target.current,
                    direction: `${alias} (${direction > 0 ? `+${direction}` : direction})`,
                    next: next.current,
                    target: nextTarget,
                    userNextIndex,
                    event, // eslint-disable-line sort-keys
                })

                if (nextTarget) {

                    const scrollTimerId = setTimeout(() => nextTarget.scrollIntoView({ behavior: mode }), delay)
                    const throttleTimerId = setTimeout(() => isScrolling.current = false, wait)

                    setCurrentTarget(next.current)

                    return () => {
                        clearTimeout(scrollTimerId)
                        clearTimeout(throttleTimerId)
                    }
                }

                const {
                    clientHeight,
                    clientWidth,
                    scrollLeft,
                    scrollHeight,
                    scrollTop,
                    scrollWidth,
                } = root.current === document
                    ? root.current.documentElement
                    : root.current

                // (3)
                if (directions === 'x' || (directions === 'both' && ['left', 'right'].includes(alias))) {
                    if (direction < 0 && scrollLeft === 0) return
                    if (direction > 0 && scrollLeft + clientWidth === scrollWidth) return
                } else if (directions === 'y' || (directions === 'both' && ['down', 'up'].includes(alias))) {
                    if (direction < 0 && scrollTop === 0) return
                    if (direction > 0 && scrollTop + clientHeight === scrollHeight) return
                }

                setCurrentTarget(direction > 0 ? targets.current.length : -1)
                isScrolling.current = false
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
            next,
            prev,
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
