
import { render, unmountComponentAtNode } from 'react-dom'
import React from 'react'
import { act } from 'react-dom/test-utils'
import useSVGMousePosition from '../src/hooks/useSVGMousePosition'

let container = null
beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
})
afterEach(() => {
    unmountComponentAtNode(container)
    container.remove()
    container = null
})

Element.prototype.getBoundingClientRect = () => ({ height: 1, width: 1, x: 2, y: 2 })

it('returns a position after using the callback refs in ref props of root and target', async () => {

    const Test = () => {

        const [position, target, root] = useSVGMousePosition()

        return (
            <div id='root' ref={root}>
                <svg ref={target} viewBox='0 0 1 1'>
                    <rect id='rect' x={position.x} y={position.y} />
                </svg>
            </div>
        )
    }

    let rect

    // 1. Render
    act(() => {
        render(<Test />, container)
        rect = container.querySelector('#rect')
    })

    expect(rect.getAttribute('x')).toBe('0')
    expect(rect.getAttribute('y')).toBe('0')

    // 2. Hover over root (but not over target)
    await act(async () => {
        container
            .querySelector('#root')
            .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 1, clientY: 1 }))
    })

    expect(rect.getAttribute('x')).toBe('-1')
    expect(rect.getAttribute('y')).toBe('-1')
})
