
import React from 'react'
import { universalDocument } from '../lib/universal'

const defaultPosition = { x: 0, y: 0 }

/**
 * useMousePosition :: Configuration -> { x: Float, y: Float, event: Event }
 *
 * It should avoid reflows in the same render cycle, by reading related values
 * in a callback given to `requestAnimationFrame`, whose execution should be
 * guarded until the callback is completed to prevent forced synchronous layout.
 *
 * It should listen for `mousemove` events in `root`, which should default to
 * the `document`, in order to get mouse positions relative to `target`, which
 * should default to `root`, in order to listen mouse events only on over.
 *
 * It should use a `thresold` property to expand/shrink the `target` area over
 * which it should receive `mousemove` events.
 *
 * Memos: compare performances of `SVG.createPoint()` and `SVG.getScreenCTM()`
 * versus `Element.getBoundingClientRect()`, to translate a DOM position into an
 * SVG position.
 * https://codepen.io/creative-wave/pen/pozLPrg
 * https://codepen.io/creative-wave/pen/pozVJL
 */
const useSVGMousePosition = ({
    initial = defaultPosition,
    isFixed = false,
    root = universalDocument,
    precision = 2,
    shouldListen = true,
    target = root,
    thresold = 1,
}) => {

    const [position, setPosition] = React.useState(initial)
    const timerId = React.useRef()
    const hasSubArea = React.useMemo(() => target !== root || thresold !== 1, [target, thresold, root])
    const onMouseMove = React.useCallback(
        ({ clientX, clientY }) => {

            const rect = target.getBoundingClientRect()
            const { x, y } = isFixed
                ? { x: rect.x - window.scrollX, y: rect.y - window.scrollY }
                : { x: rect.x, y: rect.y }

            if (hasSubArea && (
                (clientX * thresold) < x
                || (clientX / thresold) > (x + rect.width)
                || (clientY * thresold) < y
                || (clientY / thresold) > (y + rect.height))) {

                return timerId.current = null
            }

            const [,, viewBoxWidth, viewBoxHeight] = target.getAttribute('viewBox').split(' ')

            setPosition({
                x: ((clientX - x) / rect.width * viewBoxWidth).toFixed(precision),
                y: ((clientY - y) / rect.height * viewBoxHeight).toFixed(precision),
            })
            timerId.current = null
        },
        [hasSubArea, isFixed, precision, setPosition, target, thresold, timerId])

    React.useEffect(
        () => {

            if (!(shouldListen && root && target)) return

            const onMove = event => {
                if (timerId.current) return
                timerId.current = requestAnimationFrame(() => onMouseMove(event))
            }
            root.addEventListener('mousemove', onMove)

            return () => {
                timerId.current && cancelAnimationFrame(timerId.current)
                root.removeEventListener('mousemove', onMove)
            }
        },
        [onMouseMove, target, shouldListen, timerId, root])

    return position
}

export default useSVGMousePosition
