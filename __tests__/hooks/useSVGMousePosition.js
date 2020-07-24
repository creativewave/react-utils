
import { render, unmountComponentAtNode } from 'react-dom'
import React from 'react'
import { act } from 'react-dom/test-utils'
import useSVGMousePosition from '../../src/hooks/useSVGMousePosition'

let container

jest.spyOn(Element.prototype, 'getBoundingClientRect')
    .mockReturnValue({ height: 1, width: 1, x: 1, y: 1 })

beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
})
afterEach(() => {
    unmountComponentAtNode(container)
    container.remove()
    container = null
    jest.clearAllMocks()
})
afterAll(() => {
    jest.restoreAllMocks()
})

/**
 * Memo: React will call twice a callback ref defined in a ref prop if it has
 * been updated since the previous render, once with `null` then with current
 * (Fiber) `node`, thus acting as initialization/cleanup effects that should be
 * triggered either (both) when a dependency of those effects has been updated
 * or (one of them) when the component receiving this ref will mount/unmount.
 */
const cases = [
    ['set target via ref prop', ({ precision }) => {

        const [position, target] = useSVGMousePosition({ precision })

        return (
            <svg id='root' ref={target} viewBox='0 0 1 1'>
                <rect id='rect' x={position.x} y={position.y} />
            </svg>)
    }],
    ['set target (fixed) via ref prop', ({ precision }) => {

        const [position, target] = useSVGMousePosition({ isFixed: true, precision })

        return (
            <svg id='root' ref={target} viewBox='0 0 1 1'>
                <rect id='rect' x={position.x} y={position.y} />
            </svg>)
    }],
    ['set target and root via ref props', ({ precision }) => {

        const [position, target, root] = useSVGMousePosition({ hasRoot: true, precision })

        return (
            <div id='root' ref={root}>
                <svg ref={target} viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set target in useEffect()', ({ precision }) => {

        const [position, setTarget] = useSVGMousePosition({ precision })

        React.useEffect(() => {
            setTarget(document.getElementById('root'))
            // Reproduce the behavior of an updated callback ref (see memo above)
            return () => setTarget(null)
        }, [setTarget])

        return (
            <svg id='root' viewBox='0 0 1 1'>
                <rect id='rect' x={position.x} y={position.y} />
            </svg>)
    }],
    ['set target in useEffect() and root via ref prop', ({ precision }) => {

        const [position, setTarget, root] = useSVGMousePosition({ hasRoot: true, precision })

        // `setTarget` doesn't have to be re-initialized (see memo avove: `root` already handles it)
        React.useEffect(() => setTarget(document.getElementById('target')), [setTarget])

        return (
            <div id='root' ref={root}>
                <svg id='target' viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set root in useEffect()', ({ precision }) => {

        const [position, target, setRoot] = useSVGMousePosition({ hasRoot: true, precision })

        // `setRoot` doesn't have to be re-initialized (see memo avove: `target` already handles it)
        React.useEffect(() => setRoot(document.getElementById('root')), [setRoot])

        return (
            <div id='root'>
                <svg ref={target} viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set root to document in component scope', ({ precision }) => {

        const [position, target, setRoot] = useSVGMousePosition({ hasRoot: true, precision })

        // `setRoot` doesn't have to be re-initialized (see memo avove: `target` already handles it)
        setRoot(document)

        return (
            <svg ref={target} viewBox='0 0 1 1'>
                <rect id='rect' x={position.x} y={position.y} />
            </svg>)
    }],
    ['set root and target in useEffect()', ({ precision }) => {

        const [position, setTarget, setRoot] = useSVGMousePosition({ precision })

        React.useEffect(
            () => {
                setRoot(document.getElementById('root'))
                setTarget(document.getElementById('target'))
                return () => {
                    // `setTarget` doesn't have to be re-initialized (see memo avove: `setRoot` already handles it)
                    setRoot(null)
                }
            },
            [setRoot, setTarget])

        return (
            <div id='root'>
                <svg id='target' viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set target and root in useEffect()', ({ precision }) => {

        const [position, setTarget, setRoot] = useSVGMousePosition({ hasRoot: true, precision })

        React.useEffect(
            () => {
                setTarget(document.getElementById('target'))
                setRoot(document.getElementById('root'))
                return () => {
                    // `setTarget` doesn't have to be re-initialized (see memo avove: `setRoot` already handles it)
                    setRoot(null)
                }
            },
            [setRoot, setTarget])

        return (
            <div id='root'>
                <svg id='target' viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set target on consecutive updates in useEffect()', ({ precision }) => {

        const [position, setTarget, root] = useSVGMousePosition({ hasRoot: true, precision })
        const [forcedUpdate, forceUpdate] = React.useState(true)

        React.useEffect(
            () => {
                setTarget(document.getElementById('target'))
                // `setTarget` doesn't have to be re-initialized (see memo avove: `root` already handles it)
            },
            [forcedUpdate, setTarget])
        React.useEffect(forceUpdate, [forceUpdate])

        return (
            <div id='root' ref={root}>
                <svg id='target' viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
]

it.each(cases)('%s', async (caseName, Test) => {

    let rect
    let root

    // 1. It returns the initial position on mount
    act(() => {
        render(<Test precision={2} />, container)
        rect = container.querySelector('#rect')
    })

    expect(rect.getAttribute('x')).toBe('0')
    expect(rect.getAttribute('y')).toBe('0')

    // 2. It returns the mouse position on mousemove over target
    await act(async () => {
        root = container.querySelector('#root') || document
        root.scrollTop = 0
        root.scrollLeft = 0
        root.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 1, clientY: 1 }))
    })

    expect(rect.getAttribute('x')).toBe('0')
    expect(rect.getAttribute('y')).toBe('0')

    // 3. It returns the mouse position on mousemove over root but not over target (meaningless when root === target (even if it runs successfully))
    await act(async () => {
        root.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }))
    })

    expect(rect.getAttribute('x')).toBe('-1')
    expect(rect.getAttribute('y')).toBe('-1')

    // 4. It returns the mouse position after a scroll and on mousemove over target
    await act(async () => {
        root.scrollTop = 2
        root.scrollLeft = 2
        root.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }))
    })

    if (caseName === 'set target (fixed) via ref prop') {
        expect(rect.getAttribute('x')).toBe('-1')
        expect(rect.getAttribute('y')).toBe('-1')
    } else {
        expect(rect.getAttribute('x')).toBe('1')
        expect(rect.getAttribute('y')).toBe('1')
    }

    // 5. It re-initializes the listener after an update of a hook option
    act(() => {

        jest.spyOn(root, 'addEventListener')
        jest.spyOn(root, 'removeEventListener')

        render(<Test precision={0} />, container)
    })

    expect(root.removeEventListener).toHaveBeenCalledTimes(1)
    expect(root.addEventListener).toHaveBeenCalledTimes(1)

    // 6. It removes the listener before root or target as root unmounts
    act(() => {
        render(null, container)
    })

    expect(root.removeEventListener).toHaveBeenCalledTimes(2)
})
