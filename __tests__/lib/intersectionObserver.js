
import IntersectionObserver from '../../src/lib/intersectionObserver'

const elements = [{ id: 'element-1' }, { id: 'element-2' }, { id: 'element-3' }]
const callback = jest.fn((entries, observer) => callbackReturnValues.push({ entries, observer }))
const observer = new IntersectionObserver(callback)

let callbackReturnValues

beforeEach(() => callbackReturnValues = [])

/**
 * (1) The mock of IntersectionObserver use `setTimeout(callback, 0)` to delay
 * callback and simulate a real "scroll -> delay -> intersection" sequence.
 */
jest.useFakeTimers()

it('execute the callback when observing elements', () => {

    // Act
    elements.forEach(element => observer.observe(element))

    // Assert
    elements.forEach(element => expect(observer.entries).toContain(element))
    expect(callback).toHaveBeenCalledTimes(elements.length)
    callbackReturnValues.forEach(({ entries: [entry], observer: actualObserver }, index) => {
        expect(entry.isIntersecting).toBe(index === 0)
        expect(entry.target).toBe(elements[index])
        expect(actualObserver).toBe(observer)
    })
})
it('execute the callback after a WheelEvent', () => {

    // Act
    document.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }))
    jest.runAllTimers() /* (1) */

    // Assert
    expect(callback).toHaveBeenCalledTimes(4)
    callbackReturnValues.forEach(({ entries: [entry] }) =>
        expect(entry.isIntersecting).toBe(entry.target === elements[1]))
})
