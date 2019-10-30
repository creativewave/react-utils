
import React from 'react'
import noop from '../lib/noop'
import { universalDocument } from '../lib/universal'

const defaultPosition = { x: 0, y: 0 }

/**
 * useSVGMousePosition :: Configuration -> [
 *   Position,
 *   Element|null -> void,
 *   SVGElement|null -> void
 * ]
 *
 * Position => { x: Float, y: Float }
 * Configuration => {
 *   initial: Position,
 *   isFixed?: Boolean,
 *   precision?: Number,
 *   shouldListen?: Boolean,
 *   thresold?: Number,
 * }
 *
 * It should avoid multiple reflows in the same render cycle, by reading values
 * in a callback given to `requestAnimationFrame()`, whose execution should be
 * guarded until its callback is run, to prevent forced synchronous layout.
 *
 * It should use a `thresold` to expand/shrink the `target` area over which it
 * should receive `mousemove` events.
 *
 * It should listen for `mousemove` events in `root`, which should default to
 * `document` if `root` is null, over the given `target`, which should default
 * to `root` if `target` is null.
 *
 * TODO: compare performances of `SVG.createPoint()` and `SVG.getScreenCTM()` vs
 * `Element.getBoundingClientRect()`, to translate a DOM position into an SVG
 * position.
 * https://codepen.io/creative-wave/pen/pozLPrg
 * https://codepen.io/creative-wave/pen/pozVJL
 */
const useSVGMousePosition = ({
    initial = defaultPosition,
    isFixed = false,
    precision = 2,
    shouldListen = true,
    thresold = 1,
} = {}) => {

    const [position, setPosition] = React.useState(initial)

    const root = React.useRef()
    const target = React.useRef()
    const cleanup = React.useRef(noop)
    const timerId = React.useRef()

    const hasSubArea = React.useMemo(() => target.current !== root.current || thresold !== 1, [target, thresold, root])
    const onMouseMove = React.useCallback(
        ({ clientX, clientY }) => {

            const rect = target.current.getBoundingClientRect()
            const { x, y } = isFixed
                ? { x: rect.x, y: rect.y }
                : { x: rect.x - window.scrollX, y: rect.y - window.scrollY }

            if (hasSubArea && (
                (clientX * thresold) < x
                || (clientX / thresold) > (x + rect.width)
                || (clientY * thresold) < y
                || (clientY / thresold) > (y + rect.height))) {

                return timerId.current = null
            }

            const [,, viewBoxWidth, viewBoxHeight] = target.current.getAttribute('viewBox').split(' ')

            setPosition({
                x: ((clientX - x) / rect.width * viewBoxWidth).toFixed(precision),
                y: ((clientY - y) / rect.height * viewBoxHeight).toFixed(precision),
            })
            timerId.current = null
        },
        [hasSubArea, isFixed, precision, setPosition, target, thresold, timerId])

    const setRoot = React.useCallback(
        node => {

            if (node === null && typeof root.current !== 'undefined') {

                cleanup.current()
                target.current = undefined
                root.current = undefined

                return
            }
            root.current = node || universalDocument

            if (!target.current) {
                target.current = root.current
            }

            if (!(shouldListen && root.current && target.current)) {
                return
            }

            const onMove = event => {
                if (timerId.current) {
                    return
                }
                timerId.current = requestAnimationFrame(() => onMouseMove(event))
            }
            root.current.addEventListener('mousemove', onMove)
            cleanup.current = () => {
                timerId.current && cancelAnimationFrame(timerId.current)
                root.current.removeEventListener('mousemove', onMove)
            }
        },
        [cleanup, onMouseMove, root, shouldListen, target, timerId])
    const setTarget = React.useCallback(
        node => {
            if (node === null) {
                if (node !== target.current) {
                    cleanup.current()
                }
                target.current = undefined
                return
            }
            target.current = node
        },
        [cleanup, target])

    return [position, setRoot, setTarget]
}

export default useSVGMousePosition
