
import { render, unmountComponentAtNode } from 'react-dom'
import useIntersectionObserver, { observers } from '../../src/hooks/useIntersectionObserver'
import IntersectionObserver from '../../src/lib/intersectionObserver'
import React from 'react'
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
    ['set root and targets via ref props', ({ targets, onEnter, onExit, threshold }) => {

        const [root, setTarget] = useIntersectionObserver({ onEnter, onExit, threshold })

        return (
            <div ref={root} id='root'>
                {targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}
            </div>)
    }],
    ['set root in useEffect()', ({ targets, onEnter, onExit, threshold }) => {

        const [setRoot, setTarget] = useIntersectionObserver({ onEnter, onExit, threshold })

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
    ['set targets in useEffect()', ({ targets, onEnter, onExit, threshold }) => {

        const [root, setTarget] = useIntersectionObserver({ onEnter, onExit, threshold })
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
    ['set root and targets in useEffect()', ({ targets, onEnter, onExit, threshold }) => {

        const [setRoot, setTarget] = useIntersectionObserver({ onEnter, onExit, threshold })
        const prevTargets = React.useRef([])

        React.useEffect(
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
    ['set root to undefined in useEffect()', ({ targets, onEnter, onExit, threshold }) => {

        const [setRoot, setTarget] = useIntersectionObserver({ onEnter, onExit, threshold })

        React.useEffect(() => {
            setRoot()
            return () => setRoot(null)
        }, [setRoot])

        return <div>{targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}</div>
    }],
    ['set root to document in useEffect()', ({ targets, onEnter, onExit, threshold }) => {

        const [setRoot, setTarget] = useIntersectionObserver({ onEnter, onExit, threshold })

        React.useEffect(() => {
            setRoot(document)
            return () => setRoot(null)
        }, [setRoot])

        return <div>{targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}</div>
    }],
]

it.each(cases)('%s', (_, Test) => {

    let observer
    let updatedObserver
    let targets = ['target-1', 'target-2', 'target-3', 'target-4']

    const observerOptions = { rootMargin: '0px', threshold: 0 }
    const onEnter = jest.fn()
    const onExit = jest.fn()

    // 1. Executes onOnter() or onExit() for each mounted target', async () => {
    act(() => {
        render(
            <Test
                targets={targets}
                onEnter={onEnter}
                onExit={onExit}
                threshold={observerOptions.threshold} />,
            container)
    })

    observerOptions.root = container.querySelector('#root') || document
    observer = observers.get(observerOptions)
    jest.spyOn(observer, 'disconnect')
    jest.spyOn(observer, 'observe')
    jest.spyOn(observer, 'unobserve')

    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(targets.length - 1)

    // 2. Executes onOnter() and onExit() after a scroll event in root
    act(() => {
        observerOptions.root.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }))
        jest.runOnlyPendingTimers() /* (1) */
    })

    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)

    // 3. Executes observer.observe() and onExit() after mounting an additional target
    act(() => {
        targets = targets.concat('target-5')
        render(
            <Test
                targets={targets}
                onEnter={onEnter}
                onExit={onExit}
                threshold={observerOptions.threshold} />,
            container)
    })

    expect(observer.observe).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)

    // 4. Executes observer.disconnect() then onOnter() or onExit() after an update of a hook option
    act(() => {
        render(
            <Test
                targets={targets}
                onEnter={onEnter}
                onExit={onExit}
                threshold={observerOptions.threshold = 1} />,
            container)
    })

    updatedObserver = observers.get(observerOptions)
    jest.spyOn(updatedObserver, 'disconnect')
    jest.spyOn(updatedObserver, 'unobserve')

    if (observerOptions.root !== document) {
        expect(observer.disconnect).toHaveBeenCalledTimes(1)
    }
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(targets.length - 1)

    // 5. Unobserves an unmounting target
    act(() => {
        targets = targets.slice(0, targets.length - 1)
        render(
            <Test
                targets={targets}
                onEnter={onEnter}
                onExit={onExit}
                threshold={observerOptions.threshold} />,
            container)
    })

    expect(updatedObserver.unobserve).toHaveBeenCalledTimes(1)

    // 6. Disconnects an observer when root is unmounting
    act(() => {
        render(null, container)
    })

    if (observerOptions.root === document) {
        expect(observers.get(observerOptions)).toBeInstanceOf(IntersectionObserver)
    } else {
        expect(updatedObserver.disconnect).toHaveBeenCalledTimes(1)
        expect(observers.get(observerOptions)).toBeUndefined()
    }
})
