
import { render, unmountComponentAtNode } from 'react-dom'
import useScrollIntoView, { TOUCH_BUTTON_ID, TOUCH_SENSITIVITY, WHEEL_BUTTON_ID } from '../../src/hooks/useScrollIntoView'
import React from 'react'
import { act } from 'react-dom/test-utils'
import { observers } from '../../src/hooks/useIntersectionObserver'

const touches = jest.spyOn(TouchEvent.prototype, 'touches', 'get')

/**
 * PointerEvent
 *
 * It should mock the native `PointerEvent` for jsdom.
 *
 * Note: it can't be placed in `__mocks__/` otherwise ESLint will complain about
 * a manually imported mock.
 *
 * TODO: remove it when jsdom supports it.
 * Related: https://github.com/jsdom/jsdom/pull/2666
 */
class PointerEvent extends Event {

    constructor(type, { button, pointerType, screenX, screenY, ...init }) {

        super(type, init)

        this.button = button
        this.screenX = screenX
        this.screenY = screenY
        this.pointerType = pointerType
    }
}

/**
 * createEvent :: (EventType -> EventInit) -> PointerEvent|TouchEvent|WheelEvent
 */
const createEvent = (type, { button, pointerType, x = 0, y = 0 } = {}) => {

    const init = { bubbles: true }

    switch (type) {
        case 'pointerdown':
            init.button = button // eslint-disable-line no-fallthrough
        case 'pointerup':
            init.pointerType = pointerType || init.button === TOUCH_BUTTON_ID ? 'touch' : 'mouse'
            init.screenX = x * TOUCH_SENSITIVITY
            init.screenY = y * TOUCH_SENSITIVITY
            return new PointerEvent(type, init)
        case 'touchmove':
            touches.mockReturnValueOnce([{ screenX: x * TOUCH_SENSITIVITY, screenY: y * TOUCH_SENSITIVITY }])
            return new TouchEvent(type, init) // eslint-disable-line compat/compat
        case 'wheel':
            init.deltaX = x
            init.deltaY = y
            return new WheelEvent(type, init)
    }
}

let container

jest.spyOn(PointerEvent.prototype, 'preventDefault')
jest.spyOn(TouchEvent.prototype, 'preventDefault')
jest.spyOn(WheelEvent.prototype, 'preventDefault')

beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    // (1) Use fake timers to throttle scroll and intersections
    jest.useFakeTimers()
})
afterEach(() => {
    unmountComponentAtNode(container)
    container.remove()
    container = null
    observers.clear()
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
    ['set root and targets via ref props', ({ config, targets }) => {

        const [root, setTarget] = useScrollIntoView(config)

        return (
            <div ref={root} id='root'>
                {targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}
            </div>)
    }],
    ['set root in useEffect()', ({ config, targets }) => {

        const [setRoot, setTarget] = useScrollIntoView(config)

        React.useEffect(
            () => {
                setRoot(document.getElementById('root'))
                return () => setRoot(null)
            },
            [setRoot])

        return (
            <div id='root'>
                {targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}
            </div>)
    }],
    ['set targets in useEffect()', ({ config, targets }) => {

        const [root, setTarget] = useScrollIntoView(config)
        const prevTargets = React.useRef([])

        React.useEffect(
            () => {
                targets.forEach(id => {
                    if (!prevTargets.current.includes(id)) {
                        prevTargets.current.push(id)
                        setTarget(id)(document.getElementById(id))
                    }
                })
                prevTargets.current = prevTargets.current.filter(id =>
                    targets.includes(id) || setTarget(id)(null))
            },
            [prevTargets, setTarget, targets])

        return (
            <div ref={root} id='root'>
                {targets.map(id => <div key={id} id={id} />)}
            </div>)
    }],
    ['set root and targets in useEffect()', ({ config, targets }) => {

        const [setRoot, setTarget] = useScrollIntoView(config)
        const prevTargets = React.useRef([])

        React.useEffect(
            () => {
                targets.forEach(id => {
                    if (!prevTargets.current.includes(id)) {
                        prevTargets.current.push(id)
                        setTarget(id)(document.getElementById(id))
                    }
                })
                prevTargets.current = prevTargets.current.filter(id =>
                    targets.includes(id) || setTarget(id)(null))
            },
            [prevTargets, setTarget, targets])

        React.useEffect(
            () => {

                setRoot(document.getElementById('root'))

                return () => {
                    setRoot(null)
                }
            },
            [setRoot])

        return (
            <div id='root'>
                {targets.map(id => <div key={id} id={id} />)}
            </div>)
    }],
    ['set root to undefined in component scope', ({ config, targets }) => {

        const [setRoot, setTarget] = useScrollIntoView(config)

        React.useEffect(() => {
            setRoot()
            return () => setRoot(null)
        }, [setRoot])

        return <div>{targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}</div>
    }],
    ['set root to document in component scope', ({ config, targets }) => {

        const [setRoot, setTarget] = useScrollIntoView(config)

        React.useEffect(() => {
            setRoot(document)
            return () => setRoot(null)
        }, [setRoot])

        return <div>{targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}</div>
    }],
]
const events = ['pointerdown', 'pointerup', 'touchmove', 'wheel']

it.each(cases)('%s', (_, Test) => {

    const calls = {
        beforeScroll: 0,
        onEnter: 0,
        onExit: 0,
        preventDefault: {
            pointerDown: 0,
            touchMove: 0,
            wheel: 0,
        },
    }
    const config = {
        beforeScroll: jest.fn(() => {}),
        mode: 'smooth',
        onEnter: jest.fn(),
        onExit: jest.fn(),
        wait: 1000,
    }
    const targets = {
        get current() {
            return targets.elements[targets.currentIndex]
        },
        currentIndex: 0,
        elements: [],
        ids: ['target-1', 'target-2', 'target-3', 'target-4'],
    }

    let observer
    let root

    /**
     * It executes only onOnter() for each mounted target in root's viewport,
     * after mounting it.
     */
    act(() => {
        render(<Test config={config} targets={targets.ids} />, container)
        jest.runOnlyPendingTimers() // (1)
    })

    expect(config.onEnter).toHaveBeenCalledTimes(++calls.onEnter)
    expect(config.onExit).toHaveBeenCalledTimes(calls.onExit)

    /**
     * TODO: add test cases to fix when no target is intersecting on load
     *
     * 1. Load above first / below last target: targetIndex should be -1 / target.length
     * 2. Load between two targets: targetIndex should be the one with the greatest intersection ratio
     */

    /**
     * It should execute PointerEvent.preventDefault() on `pointerdown` if it's
     * a mouse with its middle (wheel) button pressed down.
     */
    act(() => {
        root = container.querySelector('#root') ?? document
        root.dispatchEvent(createEvent('pointerdown', { button: WHEEL_BUTTON_ID }))
        root.dispatchEvent(createEvent('pointerup', { pointerType: 'mouse' }))
    })

    expect(PointerEvent.prototype.preventDefault).toHaveBeenCalledTimes(++calls.preventDefault.pointerDown)

    /**
     * It executes beforeScroll()
     *          -> scrollIntoView()
     *          -> onExit() and onOnter()
     *          -> WheelEvent.preventDefault()
     * after a wheel event (scroll down) in root.
     *
     * (2) jsdom doesn't implement Element.prototype.scrollIntoView().
     * (3) The mock of IntersectionObserver triggers an intersection on wheel.
     */
    act(() => {

        jest.spyOn(root === document ? root.documentElement : root, 'scrollHeight', 'get').mockReturnValue(100)
        container.querySelectorAll('[id^=target]').forEach(target => {
            target.scrollIntoView = jest.fn() // (2)
            targets.elements.push(target)
        })

        root.dispatchEvent(createEvent('wheel', { y: 1 })) // (3)
        jest.advanceTimersByTime(config.wait) // (1)

        targets.prevIndex = targets.currentIndex
        ++targets.currentIndex
    })

    expect(config.beforeScroll).toHaveBeenNthCalledWith(
        ++calls.beforeScroll,
        targets.currentIndex,
        targets.prevIndex,
        'down')
    expect(targets.current.scrollIntoView).toHaveBeenNthCalledWith(1, { behavior: config.mode })
    expect(config.onEnter).toHaveBeenCalledTimes(++calls.onEnter)
    expect(config.onExit).toHaveBeenCalledTimes(++calls.onExit)
    expect(WheelEvent.prototype.preventDefault).toHaveBeenCalledTimes(++calls.preventDefault.wheel)

    /**
     * It executes beforeScroll() -> ... -> PointerEvent.preventDefault() after
     * a touch move if it's not over the scrollbar.
     *
     * TODO: try to find a simple way to test and fix "not over the scrollbar".
     */
    act(() => {

        root.dispatchEvent(createEvent('pointerdown', { button: TOUCH_BUTTON_ID, y: 1 }))
        root.dispatchEvent(createEvent('touchmove'))
        root.dispatchEvent(createEvent('pointerup', { pointerType: 'touch' }))
        jest.advanceTimersByTime(config.wait) // (1)

        targets.prevIndex = targets.currentIndex
        ++targets.currentIndex
    })

    expect(config.beforeScroll).toHaveBeenNthCalledWith(
        ++calls.beforeScroll,
        targets.currentIndex,
        targets.prevIndex,
        'down')
    expect(targets.current.scrollIntoView).toHaveBeenNthCalledWith(1, { behavior: config.mode })
    expect(TouchEvent.prototype.preventDefault).toHaveBeenCalledTimes(++calls.preventDefault.touchMove)

    /**
     * It executes observer.observe() -> onExit() when mounting a new target.
     */
    act(() => {
        observer = observers.observers[0][0] // eslint-disable-line prefer-destructuring
        jest.spyOn(observer, 'observe')
        render(<Test config={config} targets={targets.ids = targets.ids.concat('target-5')} />, container)
    })

    expect(observer.observe).toHaveBeenCalledTimes(1)
    expect(config.onExit).toHaveBeenCalledTimes(++calls.onExit)

    /**
     * It re-initializes event listeners after an update of a hook option.
     *
     * (4) The mock of IntersectionObserver sets a scrollTop property to 0 when
     * instantiated, such as after an update of a hook option, eventually, and
     * use it to compute the intersecting entries and the current target on
     * observe() -> onEnter(), but it should make sure to scroll the last target
     * index into view, whatever the current target index is, and it should not
     * use a static value, in order to scroll to a different index after this
     * step.
     * (5) The mock of IntersectionObserver adds a wheel event listener and
     * removes it only when it's disconnected, ie. if root !== document.
     * (6) Calls after observe().
     */
    act(() => {

        const lastTargetElement = container.querySelector('#target-5')
        lastTargetElement.scrollIntoView = jest.fn()
        targets.elements.push(lastTargetElement)

        jest.spyOn(root, 'addEventListener')
        jest.spyOn(root, 'removeEventListener')

        calls.beforeScroll = 0
        config.beforeScroll = jest.fn(next => root === document ? next + 2 : next + 3) // (4)
        config.directions = 'y'

        render(<Test config={config} targets={targets.ids} />, container)

        /* (6) */
        ++calls.onEnter
        calls.onExit += targets.ids.length - 1
    })

    expect(root.removeEventListener).toHaveBeenCalledTimes(
        root === document // (5)
            ? events.length
            : events.length + 1)

    /**
     * After a wheel event (scroll down) in root:
     * - it executes scrollIntoView() on the target whose index is returned by
     * beforeScroll().
     * - it doesn't execute onEnter() for targets between current and next, and
     * it only execute onExit() for the current target.
     */
    act(() => {
        if (root !== document) {
            observer = observers.observers[0][0] // eslint-disable-line prefer-destructuring
            // scrollTop is assigned to ExtendedIntersectionObserver instead of
            observer.observer.scrollTop = 1 // (4)
        }
        root.dispatchEvent(createEvent('wheel', { y: 3 })) // (3)
        targets.currentIndex = targets.ids.length - 1
        jest.advanceTimersByTime(config.wait) // (1)
    })

    expect(config.beforeScroll).toHaveBeenCalledTimes(++calls.beforeScroll)
    expect(config.beforeScroll).toHaveLastReturnedWith(targets.currentIndex)
    expect(targets.current.scrollIntoView).toHaveBeenCalledTimes(1)
    expect(config.onEnter).toHaveBeenCalledTimes(++calls.onEnter)
    expect(config.onExit).toHaveBeenCalledTimes(++calls.onExit)

    /**
     * It should not execute onExit() after a wheel event (scroll down) in root,
     * above the first target, or below the last target.
     */
    act(() => {
        root.dispatchEvent(createEvent('wheel', { y: 1 })) // (3)
        jest.advanceTimersByTime(config.wait) // (1)
        targets.prevIndex = targets.currentIndex
        targets.currentIndex = targets.ids.length
    })

    expect(config.beforeScroll).toHaveBeenNthCalledWith(
        ++calls.beforeScroll,
        targets.currentIndex,
        targets.prevIndex,
        'down')
    expect(config.onExit).toHaveBeenCalledTimes(calls.onExit)

    /**
     * It does nothing after a wheel event in root, further down below the last
     * target.
     */
    act(() => {
        root.dispatchEvent(createEvent('wheel', { y: 1 })) // (3)
        jest.advanceTimersByTime(config.wait) // (1)
    })

    expect(config.beforeScroll).toHaveBeenNthCalledWith(
        ++calls.beforeScroll,
        targets.currentIndex + 1,
        targets.currentIndex,
        'down')
    expect(config.onExit).toHaveBeenCalledTimes(calls.onExit)

    /**
     * It executes scrollIntoView() -> only onEnter() on the target whose index
     * is returned by beforeScroll(), after a wheel event (scroll up) from below
     * the last target.
     *
     * TODO: fix this behavior (it should scroll the last target into view when
     * its intersection ratio ~= 0.5)
     */
    act(() => {
        root.dispatchEvent(createEvent('wheel', { y: -1 })) // (3)
        jest.advanceTimersByTime(config.wait) // (1)
        targets.prevIndex = targets.currentIndex
        targets.currentIndex = targets.ids.length - 1
    })

    expect(config.beforeScroll).toHaveBeenNthCalledWith(
        ++calls.beforeScroll,
        targets.currentIndex,
        targets.prevIndex,
        'up')
    expect(targets.current.scrollIntoView).toHaveBeenCalledTimes(2)

    /**
     * It doesn't execute beforeScroll() after a wheel event towards a direction
     * that isn't watched according to config.directions, eg. scrolling left or
     * right while directions === 'y'.
     */
    act(() => {
        root.dispatchEvent(createEvent('wheel', { x: 1 })) // (3)
        jest.advanceTimersByTime(config.wait) // (1)
        root.dispatchEvent(createEvent('wheel', { x: 2, y: 1 })) // (3)
        jest.advanceTimersByTime(config.wait) // (1)
    })

    expect(config.beforeScroll).toHaveBeenCalledTimes(calls.beforeScroll)

    /**
     * It executes observer.unobserve() before a target unmounts.
     */
    act(() => {
        observer = observers.observers[0][0] // eslint-disable-line prefer-destructuring
        jest.spyOn(observer, 'unobserve')
        render(<Test config={config} targets={targets.ids.slice(0, -1)} />, container)
    })

    expect(observer.unobserve).toHaveBeenCalledTimes(1)

    /**
     * It removes event listeners and executes observer.disconnect() before root
     * unmounts.
     */
    act(() => {
        jest.spyOn(observer, 'disconnect')
        render(null, container)
    })

    // (5)
    if (root === document) {
        expect(root.removeEventListener).toHaveBeenCalledTimes(events.length * 2)
    } else {
        expect(observer.disconnect).toHaveBeenCalledTimes(1)
        expect(root.removeEventListener).toHaveBeenCalledTimes((events.length + 1) * 2)
    }
})
