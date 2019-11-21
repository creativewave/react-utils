
import { render, unmountComponentAtNode } from 'react-dom'
import React from 'react'
import { act } from 'react-dom/test-utils'
import useSVGMousePosition from '../../src/hooks/useSVGMousePosition'

const spy = jest.spyOn(Element.prototype, 'getBoundingClientRect')
let container = null

beforeAll(() => {
    spy.mockReturnValue({ height: 1, width: 1, x: 1, y: 1 })
})
beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
})
afterEach(() => {
    unmountComponentAtNode(container)
    container.remove()
    container = null
    spy.mockClear()
})
afterAll(() => {
    spy.mockRestore()
})

const cases = [
    ['set target via ref prop', () => {

        const [position, target] = useSVGMousePosition()

        return (
            <svg id='root-target' ref={target} viewBox='0 0 1 1'>
                <rect id='rect' x={position.x} y={position.y} />
            </svg>)
    }],
    ['set fixed target via ref prop', () => {

        const [position, target] = useSVGMousePosition({ isFixed: true })

        return (
            <svg id='root-target' ref={target} viewBox='0 0 1 1'>
                <rect id='rect' x={position.x} y={position.y} />
            </svg>)
    }],
    ['set root and target via ref props', () => {

        const [position, target, root] = useSVGMousePosition({ hasRoot: true })

        return (
            <div id='root' ref={root}>
                <svg ref={target} viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set root in useEffect()', () => {

        const [position, target, setRoot] = useSVGMousePosition({ hasRoot: true })

        React.useEffect(() => setRoot(document.querySelector('#root')), [setRoot])

        return (
            <div id='root'>
                <svg ref={target} viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set root to document in component scope', () => {

        const [position, target, setRoot] = useSVGMousePosition({ hasRoot: true })

        setRoot(document)

        return (
            <svg ref={target} viewBox='0 0 1 1'>
                <rect id='rect' x={position.x} y={position.y} />
            </svg>)
    }],
    ['set target in useEffect()', () => {

        const [position, setTarget, root] = useSVGMousePosition({ hasRoot: true })

        React.useEffect(() => setTarget(document.querySelector('#target')), [setTarget])

        return (
            <div id='root' ref={root}>
                <svg id='target' viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set root and target in useEffect()', () => {

        const [position, setTarget, setRoot] = useSVGMousePosition()

        React.useEffect(
            () => {
                setRoot(document.querySelector('#root'))
                setTarget(document.querySelector('#svg'))
            },
            [setRoot, setTarget])

        return (
            <div id='root'>
                <svg id='svg' viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set target and root in useEffect()', () => {

        const [position, setTarget, setRoot] = useSVGMousePosition({ hasRoot: true })

        React.useEffect(
            () => {
                setTarget(document.querySelector('#target'))
                setRoot(document.querySelector('#root'))
            },
            [setRoot, setTarget])

        return (
            <div id='root'>
                <svg id='target' viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
    ['set target on consecutive updates in useEffect()', () => {

        const [position, setTarget, root] = useSVGMousePosition({ hasRoot: true })
        const [forcedUpdate, forceUpdate] = React.useState(true)

        React.useEffect(
            () => {
                setTarget(document.querySelector('#target'))
            },
            [forcedUpdate, setTarget])
        React.useEffect(forceUpdate, [])

        return (
            <div id='root' ref={root}>
                <svg id='target' viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>)
    }],
]

it.each(cases)('returns expected positions [%s]', async (caseName, Test) => {

    let root
    let rect

    // 1. Render
    act(() => {
        render(<Test />, container)
        rect = container.querySelector('#rect')
        switch (caseName) {
            case 'set target via ref prop':
            case 'set fixed target via ref prop':
                root = container.querySelector('#root-target')
                break
            case 'set root to document in component scope':
                root = document
                break
            default:
                root = container.querySelector('#root')
                break
        }
        root.scrollTop = 0
        root.scrollLeft = 0
    })

    expect(rect.getAttribute('x')).toBe('0')
    expect(rect.getAttribute('y')).toBe('0')

    // 2. Hover over root (but not over target)
    await act(async () => {
        root.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }))
    })

    expect(rect.getAttribute('x')).toBe('-1')
    expect(rect.getAttribute('y')).toBe('-1')

    // 3. Scroll down and right
    await act(async () => {
        root.scrollTop = 2
        root.scrollLeft = 2
        root.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }))
    })

    if (caseName === 'set fixed target via ref prop') {
        expect(rect.getAttribute('x')).toBe('-1')
        expect(rect.getAttribute('y')).toBe('-1')
    } else {
        expect(rect.getAttribute('x')).toBe('1')
        expect(rect.getAttribute('y')).toBe('1')
    }
})
