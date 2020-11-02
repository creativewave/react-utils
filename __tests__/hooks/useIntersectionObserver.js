
import { render, unmountComponentAtNode } from 'react-dom'
import { useEffect, useRef } from 'react'
import useIntersectionObserver, { ExtendedIntersectionObserver, observers } from '../../src/hooks/useIntersectionObserver'
import { act } from 'react-dom/test-utils'

let container

beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    // (1) The mock of IntersectionObserver uses `setTimeout(IntersectionObserverCallback, 0)`
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

        const [root, setTarget] = useIntersectionObserver(config)

        return (
            <div ref={root} id='root'>
                {targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}
            </div>)
    }],
    ['set root in useEffect()', ({ config, targets }) => {

        const [setRoot, setTarget] = useIntersectionObserver(config)

        useEffect(
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

        const [root, setTarget] = useIntersectionObserver(config)
        const prevTargets = useRef([])

        useEffect(
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

        const [setRoot, setTarget] = useIntersectionObserver(config)
        const prevTargets = useRef([])

        useEffect(
            () => {
                prevTargets.current = prevTargets.current.filter(id =>
                    targets.includes(id) || setTarget(id)(null))
                targets.forEach(id => {
                    if (!prevTargets.current.includes(id)) {
                        prevTargets.current.push(id)
                        setTarget(id)(document.getElementById(id))
                    }
                })
            },
            [prevTargets, setTarget, targets])

        useEffect(
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
    ['set root to undefined in useEffect()', ({ config, targets }) => {

        const [setRoot, setTarget] = useIntersectionObserver(config)

        useEffect(() => {
            setRoot()
            return () => setRoot(null)
        }, [setRoot])

        return <div>{targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}</div>
    }],
    ['set root to document in useEffect()', ({ config, targets }) => {

        const [setRoot, setTarget] = useIntersectionObserver(config)

        useEffect(() => {
            setRoot(document)
            return () => setRoot(null)
        }, [setRoot])

        return <div>{targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}</div>
    }],
]

it.each(cases)('%s', (_, Test) => {

    let observer
    let onEnterCount = 0
    let onExitCount = 0
    let root
    let targets = ['target-1', 'target-2', 'target-3', 'target-4']

    const config = {
        onEnter: jest.fn(),
        onExit: jest.fn(),
        rootMargin: '0px',
        threshold: 0,
    }

    /**
     * It executes onOnter() or onExit() for each mounted target when mounting
     * root.
     */
    act(() => {
        render(<Test config={config} targets={targets} />, container)
        jest.runOnlyPendingTimers() // (1)
    })

    expect(config.onEnter).toHaveBeenCalledTimes(++onEnterCount)
    expect(config.onExit).toHaveBeenCalledTimes(onExitCount = targets.length - 1)

    /**
     * It executes onExit() or onOnter() after an intersection.
     *
     * (2) The mock of IntersectionObserver should trigger an intersection on
     * wheel.
     */
    act(() => {
        root = container.querySelector('#root') || document
        root.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 1 })) // (2)
        jest.runOnlyPendingTimers() // (1)
    })

    expect(config.onEnter).toHaveBeenCalledTimes(++onEnterCount)
    expect(config.onExit).toHaveBeenCalledTimes(++onExitCount)

    /**
     * It executes observer.observe() -> onExit() when mounting a new target.
     */
    act(() => {

        config.root = root === document ? null : (root ?? null)
        observer = observers.get(config)
        jest.spyOn(observer, 'observe')

        targets = targets.concat('target-5')
        render(<Test config={config} targets={targets} />, container)
    })

    expect(observer.observe).toHaveBeenCalledTimes(1)
    expect(config.onExit).toHaveBeenCalledTimes(++onExitCount)

    /**
     * It executes observer.disconnect() if root !== document or
     * observer.unobserve() if root === document, then onOnter() or onExit(),
     * after an update of a hook option.
     */
    act(() => {

        jest.spyOn(observer, 'disconnect')
        jest.spyOn(observer, 'unobserve')

        config.threshold = 1
        render(<Test config={config} targets={targets} />, container)
    })

    if (root === document) {
        expect(observer.unobserve).toHaveBeenCalledTimes(targets.length)
        expect(observer.disconnect).toHaveBeenCalledTimes(0)
    } else {
        expect(observer.unobserve).toHaveBeenCalledTimes(0)
        expect(observer.disconnect).toHaveBeenCalledTimes(1)
        expect(observers.get({ ...config, threshold: 0 })).toBeUndefined()
    }
    expect(config.onEnter).toHaveBeenCalledTimes(++onEnterCount)
    expect(config.onExit).toHaveBeenCalledTimes(onExitCount += targets.length - 1)

    /**
     * It executes observer.unobserve() before a target unmounts.
     */
    act(() => {

        targets = targets.slice(0, -1)
        observer = observers.get(config)
        jest.spyOn(observer, 'unobserve')

        render(<Test config={config} targets={targets} />, container)
    })

    expect(observer.unobserve).toHaveBeenCalledTimes(1)

    /**
     * It executes observer.disconnect() if root !== document before root
     * unmounts.
     */
    act(() => {
        jest.spyOn(observer, 'disconnect')
        render(null, container)
    })

    if (root === document) {
        expect(observers.get(config)).toBeInstanceOf(ExtendedIntersectionObserver)
    } else {
        expect(observer.disconnect).toHaveBeenCalledTimes(1)
        expect(observers.get(config)).toBeUndefined()
    }
})

it('uses a single observer for a given set of IntersectionObserverOptions', () => {

    const calls = {
        componentA: { onEnter: 0, onExit: 0 },
        componentB: { onEnter: 0, onExit: 0 },
    }
    const config = {
        componentA: { onEnter: jest.fn(), onExit: jest.fn() },
        componentB: { onEnter: jest.fn(), onExit: jest.fn() },
    }
    const targets = ['target-1', 'target-2']
    const [, Test] = cases.find(([name]) => name === 'set root to undefined in useEffect()')

    /**
     * It executes onOnter() or onExit() for each target and for each hook users
     * (components).
     */
    act(() => {
        render(
            (<>
                <Test config={config.componentA} targets={targets.map(id => `ComponentA-${id}`)} />
                <Test config={config.componentB} targets={targets.map(id => `ComponentB-${id}`)} />
            </>),
            container)
        jest.runOnlyPendingTimers() // (1)
    })

    expect(observers.observers).toHaveLength(1)
    expect(config.componentA.onEnter).toHaveBeenCalledTimes(++calls.componentA.onEnter)
    expect(config.componentA.onExit).toHaveBeenCalledTimes(++calls.componentA.onExit)
    expect(config.componentB.onExit).toHaveBeenCalledTimes(calls.componentB.onExit += 2)

    /**
     * It executes onExit() or onOnter() after an intersection, only for the
     * hook user that has children intersecting its root element.
     */
    act(() => {
        document.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 1 })) // (2)
        jest.runOnlyPendingTimers() /* (1) */
    })

    expect(config.componentA.onEnter).toHaveBeenCalledTimes(++calls.componentA.onEnter)
    expect(config.componentA.onExit).toHaveBeenCalledTimes(++calls.componentA.onExit)
    expect(config.componentB.onEnter).toHaveBeenCalledTimes(calls.componentB.onEnter)
    expect(config.componentB.onExit).toHaveBeenCalledTimes(calls.componentB.onExit)

    /**
     * It executes onExit() when mounting a new target, only for the hook user
     * (component) that renders and observes it.
     */
    act(() => {
        render(
            (<>
                <Test config={config.componentA} targets={targets.concat('target-3').map(id => `ComponentA-${id}`)} />
                <Test config={config.componentB} targets={targets.map(id => `ComponentB-${id}`)} />
            </>),
            container)
    })

    expect(config.componentA.onEnter).toHaveBeenCalledTimes(calls.componentA.onEnter)
    expect(config.componentB.onEnter).toHaveBeenCalledTimes(calls.componentB.onEnter)
    expect(config.componentA.onExit).toHaveBeenCalledTimes(++calls.componentA.onExit)
    expect(config.componentB.onExit).toHaveBeenCalledTimes(calls.componentB.onExit)
})
