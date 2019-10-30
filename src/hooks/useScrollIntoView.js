
import React from 'react'
import log from '../lib/log'
import noop from '../lib/noop'
import { universalDocument } from '../lib/universal'
import useIntersectionObserver from './useIntersectionObserver'

/**
 * getScrollDirection :: (Event -> Position?) -> String|void
 *
 * Position => { x: Number, y: Number }
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

    if (event.type === 'touchmove' && (Math.abs(move.x) + Math.abs(move.y)) < 150) return

    return Math.abs(move.x) > Math.abs(move.y)
        ? move.x > 0 ? 'right' : 'left'
        : move.y > 0 ? 'down' : 'up'
}

/**
 * addListeners :: (Element -> [Element] -> (Event -> Boolean) -> { current: Boolean })
 *              -> (void -> void)
 */
const addListeners = (viewPort, targets, onScroll, isScrolling) => {

    if (!(viewPort && targets.length)) return

    let cancelTimers
    let firstTouch
    let isPointerDown
    const onWheel = event => {
        if (isScrolling.current) return
        cancelTimers = onScroll(event, firstTouch)
        if ((isPointerDown && event.type !== 'touchmove') || !cancelTimers) return
        // Disable native scroll action
        // https://stackoverflow.com/questions/4770025/how-to-disable-scrolling-temporarily
        event.preventDefault()
        // TODO: check if it's really required.
        event.returnValue = false
    }
    const onPointerDown = () => isPointerDown = true
    const onPointerUp = () => isPointerDown = false
    const onTouchStart = event => firstTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY }

    viewPort.addEventListener('pointerdown', onPointerDown)
    viewPort.addEventListener('pointerup', onPointerUp)
    viewPort.addEventListener('touchstart', onTouchStart)
    viewPort.addEventListener('touchmove', onWheel, { passive: false })
    viewPort.addEventListener('wheel', onWheel, { passive: false })

    return () => {
        cancelTimers && cancelTimers()
        viewPort.removeEventListener('pointerdown', onPointerDown)
        viewPort.removeEventListener('pointerup', onPointerUp)
        viewPort.removeEventListener('touchstart', onTouchStart)
        viewPort.removeEventListener('touchmove', onWheel, { passive: false })
        viewPort.removeEventListener('wheel', onWheel, { passive: false })
    }
}

/**
 * useScrollIntoView :: Configuration -> [Element|null -> void, Element|null -> void]
 *
 * Configuration => {
 *   beforeScroll?: (Number -> Number -> String) -> Number|void,
 *   delay?: Number,
 *   mode?: String,
 *   onEnter?: (Entry -> Observer) -> void,
 *   onExit?: (Entry -> Observer) -> void,
 *   wait?: Number,
 * }
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
    debug,
    beforeScroll = noop,
    delay = 200,
    mode = 'smooth',
    onEnter = noop,
    onExit,
    rootMargin,
    threshold = 1,
    wait = 1000,
} = {}) => {

    const root = React.useRef()
    const targets = React.useRef([])
    const cleanup = React.useRef(noop)
    const isScrolling = React.useRef(false)

    const target = React.useRef(-1)
    const setCurrentTarget = React.useCallback(index => target.current = index, [])
    const handleEnter = React.useCallback(
        entry => {
            setCurrentTarget(targets.current.findIndex(([, node]) => node === entry.target))
            onEnter(entry)
        },
        [onEnter, setCurrentTarget, targets])

    const [setOberverRootRef, setObserverTargetRef] = useIntersectionObserver({
        debug,
        onEnter: handleEnter,
        onExit,
        rootMargin,
        threshold,
    })

    const setRoot = React.useCallback(
        node => {

            if (node === null && typeof root.current !== 'undefined') {

                cleanup.current()
                targets.current = []
                root.current = undefined

                return
            }

            root.current = node || universalDocument
            setOberverRootRef(node)

            if (targets.current.length === 0) {
                return
            }

            cleanup.current = addListeners(
                root.current,
                targets.current.map(([, node]) => node),
                onScroll,
                isScrolling)

            return
        },
        [isScrolling, onScroll, root, setOberverRootRef, targets])
    const setTarget = React.useCallback(
        id => node => {
            setObserverTargetRef(id)(node)
            if (node === null) {
                targets.current = targets.current.filter(([nodeId]) => nodeId !== id)
                return
            }
            targets.current.push([id, node])
        },
        [setObserverTargetRef, targets])

    const onScroll = React.useCallback(
        (event, firstTouch) => {

            const direction = getScrollDirection(event, firstTouch)

            if (direction !== 'down' && direction !== 'up') return

            const nextIndex = direction === 'down' ? target.current + 1 : target.current - 1
            const userNextIndex = beforeScroll(nextIndex, target.current, direction)
            const scrollTarget =
                (targets.current[userNextIndex] && targets.current[userNextIndex][1])
                || (targets.current[nextIndex] && targets.current[nextIndex][1])

            log('[use-scroll-into-view]', debug, {
                currentIndex: target.current,
                direction,
                nextIndex,
                target: scrollTarget,
                userNextIndex,
                event,
            })

            if (!scrollTarget) {

                const {
                    clientHeight = root.current.body.clientHeight,
                    scrollTop = root.current.body.scrollTop,
                } = root.current

                if (direction === 'up' && scrollTop === 0) return
                if (direction === 'down' && scrollTop === clientHeight) return

                setCurrentTarget(direction === 'down' ? targets.current.length : -1)

                return
            }

            const scrollTimerId = setTimeout(() => scrollTarget.scrollIntoView({ behavior: mode }), delay)
            const throttleTimerId = setTimeout(() => isScrolling.current = false, wait)

            return () => {
                clearTimeout(scrollTimerId)
                clearTimeout(throttleTimerId)
            }
        },
        [beforeScroll, debug, delay, isScrolling, mode, root, setCurrentTarget, target, targets, wait])

    return [setRoot, setTarget]
}

export default useScrollIntoView
