
import { render, unmountComponentAtNode } from 'react-dom'
import Filter from '../../src/components/svg-filters'
import React from 'react'
import { act } from 'react-dom/test-utils'

let container

beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
})
afterEach(() => {
    unmountComponentAtNode(container)
    container.remove()
    container = null
})

it('should set default attributes', () => {

    let filter

    act(() => {
        render(<svg><Filter name='shadow' /></svg>, container)
    })

    filter = container.querySelector('filter')

    expect(filter.id).toBe('shadow')
    expect(filter.getAttribute('width')).toBe('300%')
    expect(filter.getAttribute('height')).toBe('300%')
    expect(filter.getAttribute('x')).toBe('-100%')
    expect(filter.getAttribute('y')).toBe('-100%')
    expect(filter.getAttribute('color-interpolation')).toBe('sRGB')
    // Only when last primitive is <feBlend>, <feComposite>, or <feMerge>
    expect(filter.lastElementChild.getAttribute('in')).toBe('SourceGraphic')

    act(() => {
        render(<svg><Filter name='shadow-inset' /></svg>, container)
    })

    filter = container.querySelector('filter')

    expect(filter.getAttribute('width')).toBe('100%')
    expect(filter.getAttribute('height')).toBe('100%')
    expect(filter.getAttribute('x')).toBe('0%')
    expect(filter.getAttribute('y')).toBe('0%')
})
it('should set expected dimension/coordinate atributes', () => {

    act(() => {
        render(<svg><Filter name='shadow' x='50%' height='300%' /></svg>, container)
    })

    const filter = container.querySelector('filter')

    expect(filter.getAttribute('width')).toBeNull()
    expect(filter.getAttribute('height')).toBe('300%')
    expect(filter.getAttribute('x')).toBe('50%')
    expect(filter.getAttribute('y')).toBe('-100%')
})
it('should compose multiple filter primitives when given a `in` prop', () => {

    act(() => {
        render(
            <svg>
                <filter id='shadow-glow'>
                    <Filter result='shadow' name='shadow' />
                    <Filter in='shadow' name='glow' />
                </filter>
            </svg>,
            container)
    })

    // Ie. blend/compose/merge in the result of the previous effect.
    expect(container.querySelector('filter').lastElementChild.getAttribute('in')).toBe('shadow')
})
