
import { render, unmountComponentAtNode } from 'react-dom'
import React from 'react'
import { act } from 'react-dom/test-utils'
import { observers } from '../../src/hooks/useIntersectionObserver'
import useScrollIntoView from '../../src/hooks/useScrollIntoView'

let container

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
const events = ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'wheel']

it.each(cases)('%s', (_, Test) => {

    const config = {
        beforeScroll: jest.fn(() => {}),
        mode: 'smooth',
        onEnter: jest.fn(),
        onExit: jest.fn(),
        wait: 1000,
    }

    let currentTargetIndex
    let elements
    let observer
    let onEnterCalls = 0
    let onExitCalls = 0
    let nextTargetIndex
    let root
    let scrollDirection
    let targets = ['target-1', 'target-2', 'target-3', 'target-4']

    /**
     * It executes onOnter() or onExit() for each mounted target when mounting
     * root.
     */
    act(() => {
        render(<Test config={config} targets={targets} />, container)
    })

    expect(config.onEnter).toHaveBeenCalledTimes(++onEnterCalls)
    expect(config.onExit).toHaveBeenCalledTimes(onExitCalls = targets.length - 1)

    /**
     * It executes beforeScroll() -> scrollIntoView() -> onExit() or onOnter()
     * after a wheel event (scroll down) in root.
     *
     * (2) jsdom doesn't implement Element.prototype.scrollIntoView().
     * (3) The mock of IntersectionObserver should trigger an intersection on
     * wheel.
     */
    act(() => {

        root = container.querySelector('#root') || document
        elements = container.querySelectorAll('[id^=target]')
        elements.forEach(target => target.scrollIntoView = jest.fn()) // (2)

        root.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 1 })) // (3)
        jest.advanceTimersByTime(config.wait) // (1)
        currentTargetIndex = 1
    })

    expect(config.beforeScroll).toHaveBeenNthCalledWith(1, 1, 0, 'down')
    expect(elements[currentTargetIndex].scrollIntoView).toHaveBeenNthCalledWith(1, { behavior: config.mode })
    expect(config.onEnter).toHaveBeenCalledTimes(++onEnterCalls)
    expect(config.onExit).toHaveBeenCalledTimes(++onExitCalls)

    /**
     * It executes observer.observe() -> onExit() when mounting a new target.
     */
    act(() => {
        observer = observers.observers[0][0] // eslint-disable-line prefer-destructuring
        jest.spyOn(observer, 'observe')
        render(<Test config={config} targets={targets = targets.concat('target-5')} />, container)
    })

    expect(observer.observe).toHaveBeenCalledTimes(1)
    expect(config.onExit).toHaveBeenCalledTimes(++onExitCalls)

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
     */
    act(() => {

        jest.spyOn(root, 'addEventListener')
        jest.spyOn(root, 'removeEventListener')

        config.beforeScroll = jest.fn((next, current, direction) => {

            currentTargetIndex = current
            scrollDirection = direction
            nextTargetIndex = next

            return current
        })
        render(<Test config={config} targets={targets} />, container)
    })

    expect(root.removeEventListener).toHaveBeenCalledTimes(
        root === document // (5)
            ? events.length
            : events.length + 1)

    /**
     * It executes scrollIntoView() on the target whose index is returned by
     * beforeScroll() after a wheel event.
     */
    act(() => {
        root.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 1 }))
        jest.advanceTimersByTime(config.wait) // (1)
    })

    expect(config.beforeScroll).toHaveBeenNthCalledWith(1, nextTargetIndex, currentTargetIndex, scrollDirection)
    expect(config.beforeScroll).toHaveReturnedWith(currentTargetIndex)
    expect(elements[currentTargetIndex].scrollIntoView).toHaveBeenNthCalledWith(
        root === document ? 2 : 1,
        { behavior: config.mode })

    // TODO: add tests when target index < 0 or index >= targets.length
    // TODO: add tests with config.directions = 'x' and wheel events in y direction
    // TODO: add tests with config.directions = 'y' and wheel events in x direction
    // TODO: add tests with config.directions = 'both' and wheel events in both directions

    /**
     * It executes observer.unobserve() before a target unmounts.
     */
    act(() => {
        observer = observers.observers[0][0] // eslint-disable-line prefer-destructuring
        jest.spyOn(observer, 'unobserve')
        render(<Test config={config} targets={targets = targets.slice(0, targets.length - 1)} />, container)
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
