
import React from 'react'
import noop from '../lib/noop'
import round from '../lib/round'
import task from '../lib/task'

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
 *   hasRoot?: Boolean,
 *   initial?: Position,
 *   isFixed?: Boolean,
 *   precision?: Number,
 * }
 *
 * It should avoid multiple reflows in the same render cycle, by reading values
 * in a callback given to `requestAnimationFrame()`, whose execution should be
 * guarded until its callback is run, to prevent forced synchronous layout.
 *
 * TODO: compare performances of `SVG.createPoint()` and `SVG.getScreenCTM()` vs
 * `Element.getBoundingClientRect()`, to translate a DOM position into an SVG
 * position.
 * https://codepen.io/creative-wave/pen/pozLPrg
 * https://codepen.io/creative-wave/pen/pozVJL
 */
const useSVGMousePosition = ({
    hasRoot = false,
    initial = defaultPosition,
    isFixed = false,
    precision = 2,
} = {}) => {

    const [position, setPosition] = React.useState(initial)

    const didMount = React.useRef(false)
    const root = React.useRef()
    const target = React.useRef()
    const cleanup = React.useRef(noop)
    const timerId = React.useRef()

    const initListener = React.useCallback(
        (root, target = root) => {

            const updatePosition = ({ clientX, clientY }) => {

                const { height, width, x, y } = target.getBoundingClientRect()
                const [,, viewBoxWidth, viewBoxHeight] = target.getAttribute('viewBox').split(' ')

                setPosition({
                    x: round(precision, (clientX - (isFixed ? x - window.scrollX : x)) / width * viewBoxWidth),
                    y: round(precision, (clientY - (isFixed ? y - window.scrollY : y)) / height * viewBoxHeight),
                })
                timerId.current = null
            }

            const onMouseMove = event => {
                if (timerId.current) {
                    return
                }
                timerId.current = task.request(() => updatePosition(event))
            }

            root.addEventListener('mousemove', onMouseMove)
            cleanup.current = () => {
                timerId.current && task.cancel(timerId.current)
                root.removeEventListener('mousemove', onMouseMove)
            }
        },
        [isFixed, precision, setPosition, timerId])

    const setRoot = React.useCallback(
        node => {
            root.current = node
            if (node === null) {
                if (cleanup.current) {
                    cleanup.current()
                }
                return
            } else if ((node === root.current && !cleanup) || !target.current) {
                return
            }
            initListener(root.current, target.current)
        },
        [cleanup, initListener, root, target])
    const setTarget = React.useCallback(
        node => {
            target.current = node
            if (node === null) {
                cleanup.current()
                return
            } else if (hasRoot) {
                return
            }
            initListener(target.current)
        },
        [cleanup, hasRoot, initListener, target])

    React.useEffect(
        () => {
            if (!didMount.current) {
                didMount.current = true
                return
            }
            if (target.current) {
                setTarget(target.current)
            }
            if (root.current) {
                setRoot(root.current)
            }
        },
        [didMount, root, setRoot, setTarget, target])

    return [position, setTarget, setRoot]
}

export default useSVGMousePosition
