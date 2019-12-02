
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
        (root, target) => {

            const updatePosition = event => {

                const { height, width, x, y } = target.getBoundingClientRect()
                const [,, viewBoxWidth, viewBoxHeight] = target.getAttribute('viewBox').split(' ')

                setPosition({
                    x: round(precision, (event.clientX - (isFixed ? x : x - root.scrollLeft)) / width * viewBoxWidth),
                    y: round(precision, (event.clientY - (isFixed ? y : y - root.scrollTop)) / height * viewBoxHeight),
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
                cleanup.current = noop
            }
        },
        [isFixed, precision, setPosition, timerId])

    const setRoot = React.useCallback(
        node => {
            if (node === root.current) {
                return
            }
            root.current = node
            if (node === null) {
                return cleanup.current()
            } else if (!target.current) {
                return
            }
            initListener(root.current, target.current)
        },
        [cleanup, initListener, root, target])
    const setTarget = React.useCallback(
        node => {
            if (node === target.current) {
                return
            }
            target.current = node
            if (node === null) {
                return cleanup.current()
            } else if (hasRoot && !root.current) {
                return
            }
            initListener(root.current || target.current, target.current)
        },
        [cleanup, hasRoot, initListener, root, target])

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
