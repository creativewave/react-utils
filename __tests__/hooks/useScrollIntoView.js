
import { render, unmountComponentAtNode } from 'react-dom'
import React from 'react'
import { act } from 'react-dom/test-utils'
import { observers } from '../../src/hooks/useIntersectionObserver'
import useScrollIntoView from '../../src/hooks/useScrollIntoView'

let container

beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    // (1) Use fake timers to throttle wheel events (and intersections)
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
    let onEnterCount = 0
    let onExitCount = 0
    let nextTargetIndex
    let root
    let scrollDirection
    let targets = ['target-1', 'target-2', 'target-3', 'target-4']

    // 1. It executes onOnter() or onExit() for each mounted target when mounting root
    act(() => {
        render(<Test config={config} targets={targets} />, container)
    })

    expect(config.onEnter).toHaveBeenCalledTimes(++onEnterCount)
    expect(config.onExit).toHaveBeenCalledTimes(onExitCount = targets.length - 1)

    // 2. It executes beforeScroll() -> scrollIntoView() -> onExit() and onOnter() after a wheel event in root
    // Memo: the mock of IntersectionObserver triggers intersections on wheel
    act(() => {

        root = container.querySelector('#root') || document
        elements = container.querySelectorAll('[id^=target]')
        // Memo: jsdom doesn't implement Element.prototype.scrollIntoView()
        elements.forEach(element => element.scrollIntoView = jest.fn())

        root.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 1 }))
        jest.advanceTimersByTime(config.wait) /* (1) */
        currentTargetIndex = 1
    })

    expect(config.beforeScroll).toHaveBeenCalledTimes(1)
    expect(config.beforeScroll).toHaveBeenCalledWith(1, 0, 'down')
    expect(elements[currentTargetIndex].scrollIntoView).toHaveBeenCalledTimes(1)
    expect(elements[currentTargetIndex].scrollIntoView).toHaveBeenCalledWith({ behavior: config.mode })
    expect(config.onEnter).toHaveBeenCalledTimes(++onEnterCount)
    expect(config.onExit).toHaveBeenCalledTimes(++onExitCount)

    // 3. It executes observer.observe() -> onExit() when mounting a new target
    act(() => {
        observer = observers.observers[0][0] // eslint-disable-line prefer-destructuring
        jest.spyOn(observer, 'observe')
        targets = targets.concat('target-5')
        render(<Test config={config} targets={targets} />, container)
    })

    expect(observer.observe).toHaveBeenCalledTimes(1)
    expect(config.onExit).toHaveBeenCalledTimes(++onExitCount)

    // 4. It re-initializes events listeners after an update of a hook option
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

    // Memo: the mock of IntersectionObserver adds a wheel event listener and
    // removes it only when it's disconnected, ie. if root !== document
    expect(root.removeEventListener).toHaveBeenCalledTimes(root === document ? events.length : events.length + 1)

    // 5. It executes scrollIntoView() with the value returned by beforeScroll() after a wheel event
    act(() => {
        root.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 1 }))
        jest.advanceTimersByTime(config.wait) /* (1) */
    })

    expect(config.beforeScroll).toHaveBeenCalledTimes(1)
    expect(config.beforeScroll).toHaveBeenCalledWith(nextTargetIndex, currentTargetIndex, scrollDirection)
    expect(config.beforeScroll).toHaveReturnedWith(currentTargetIndex)
    expect(elements[currentTargetIndex].scrollIntoView).toHaveBeenCalledTimes(root === document ? 2 : 1)
    expect(elements[currentTargetIndex].scrollIntoView).toHaveBeenCalledWith({ behavior: config.mode })

    // TODO: add tests when target index < 0 or index >= targets.length
    // TODO: add tests with config.directions = 'x' and wheel events in y direction
    // TODO: add tests with config.directions = 'y' and wheel events in x direction
    // TODO: add tests with config.directions = 'both' and wheel events in both directions

    // 6. It executes observer.unobserve() before a target unmounts
    act(() => {

        observer = observers.observers[0][0] // eslint-disable-line prefer-destructuring
        jest.spyOn(observer, 'unobserve')

        targets = targets.slice(0, targets.length - 1)
        render(<Test config={config} targets={targets} />, container)
    })

    expect(observer.unobserve).toHaveBeenCalledTimes(1)

    // 7. It removes listener and executes observer.disconnect() before root unmounts if root !== document
    act(() => {
        jest.spyOn(observer, 'disconnect')
        render(null, container)
    })

    // Note: see memo in 4.
    if (root === document) {
        expect(root.removeEventListener).toHaveBeenCalledTimes(events.length * 2)
    } else {
        expect(observer.disconnect).toHaveBeenCalledTimes(1)
        expect(root.removeEventListener).toHaveBeenCalledTimes((events.length + 1) * 2)
    }
})
