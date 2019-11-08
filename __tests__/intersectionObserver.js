
import IntersectionObserver from '../src/lib/intersectionObserver'

const elements = [{ id: 'element-1' }, { id: 'element-2' }, { id: 'element-3' }]
const callback = jest.fn((entries, observer) => callbackReturnValues.push({ entries, observer }))
const observer = new IntersectionObserver(callback)

let callbackReturnValues
beforeEach(() => callbackReturnValues = [])

it('execute the callback when observing elements', () => {

    elements.forEach(element => observer.observe(element))

    elements.forEach(element => expect(observer.entries.includes(element)).toBe(true))
    expect(callback).toHaveBeenCalledTimes(3)
    callbackReturnValues.forEach(({ entries: [entry], observer: actualObserver }, index) => {
        expect(entry.isIntersecting).toBe(index === 0)
        expect(entry.target).toBe(elements[index])
        expect(actualObserver).toBe(observer)
    })
})
it('execute the callback after a WheelEvent', () => {

    document.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }))

    expect(callback).toHaveBeenCalledTimes(4)
    callbackReturnValues.forEach(({ entries: [entry] }) =>
        expect(entry.isIntersecting).toBe(entry.target === elements[1]))
})
