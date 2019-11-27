
import { render, unmountComponentAtNode } from 'react-dom'
import IntersectionObserver from '../../src/lib/intersectionObserver'
import React from 'react'
import { act } from 'react-dom/test-utils'
import { observers } from '../../src/hooks/useIntersectionObserver'
import useScrollIntoView from '../../src/hooks/useScrollIntoView'

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
    ['set root and targets via ref props', ({ beforeScroll, targets, onEnter, onExit }) => {

        const [root, setTarget] = useScrollIntoView({ beforeScroll, onEnter, onExit })

        return (
            <div ref={root} id='root'>
                {targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}
            </div>)
    }],
    ['set root in useEffect()', ({ beforeScroll, targets, onEnter, onExit }) => {

        const [setRoot, setTarget] = useScrollIntoView({ beforeScroll, onEnter, onExit })

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
    ['set targets in useEffect()', ({ beforeScroll, targets, onEnter, onExit }) => {

        const [root, setTarget] = useScrollIntoView({ beforeScroll, onEnter, onExit })
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
    ['set root and targets in useEffect()', ({ beforeScroll, targets, onEnter, onExit }) => {

        const [setRoot, setTarget] = useScrollIntoView({ beforeScroll, onEnter, onExit })
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
    ['set root to document in component scope', ({ beforeScroll, targets, onEnter, onExit }) => {

        const [setRoot, setTarget] = useScrollIntoView({ beforeScroll, onEnter, onExit })

        React.useEffect(() => {
            setRoot(document)
            return () => setRoot(null)
        }, [setRoot])

        return <div>{targets.map(id => <div key={id} ref={setTarget(id)} id={id} />)}</div>
    }],
]
const events = ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'wheel']

describe.each(cases)('useScrollIntoView [%s]', (caseName, Test) => {

    let beforeScroll
    let container
    let observer
    let targets = ['target-1', 'target-2', 'target-3', 'target-4']
    let updatedObserver

    const observerOptions = { rootMargin: '0px', threshold: 1 }
    const onEnter = jest.fn()
    const onExit = jest.fn()

    beforeAll(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
    })
    afterEach(() => {
        jest.clearAllMocks()
    })
    afterAll(() => {
        unmountComponentAtNode(container)
        container.remove()
        container = null
    })

    it('executes onOnter() or onExit() for each mounted target', () => {

        act(() => {
            beforeScroll = jest.fn(index => index)
            render(
                <Test
                    beforeScroll={beforeScroll}
                    targets={targets}
                    onEnter={onEnter}
                    onExit={onExit} />,
                container)
        })

        observerOptions.root = container.querySelector('#root') || document
        observer = observers.get(observerOptions)
        jest.spyOn(observer, 'observe')
        jest.spyOn(observer, 'disconnect')
        jest.spyOn(observerOptions.root, 'addEventListener')
        jest.spyOn(observerOptions.root, 'removeEventListener')

        expect(onEnter).toHaveBeenCalledTimes(1)
        expect(onExit).toHaveBeenCalledTimes(targets.length - 1)
    })

    it('execute beforeScroll(), onOnter() or onExit() after a scroll event in root', () => {

        act(() => {
            observerOptions.root.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }))
        })

        expect(beforeScroll).toHaveBeenCalledTimes(1)
        expect(onEnter).toHaveBeenCalledTimes(1)
        expect(onExit).toHaveBeenCalledTimes(1)
    })

    it('executes observer.observe() and onExit() after mounting an additional target', () => {

        act(() => {
            targets = targets.concat('target-5')
            render(
                <Test
                    beforeScroll={beforeScroll}
                    targets={targets}
                    onEnter={onEnter}
                    onExit={onExit} />,
                container)
        })

        expect(observer.observe).toHaveBeenCalledTimes(1)
        expect(onExit).toHaveBeenCalledTimes(1)
    })

    it('removes listeners and executes observer.disconnect() then onOnter() or onExit() after an update of a hook option', () => {

        act(() => {
            render(
                <Test
                    beforeScroll={beforeScroll = i => i}
                    targets={targets}
                    onEnter={onEnter}
                    onExit={onExit} />,
                container)
        })

        updatedObserver = observers.get(observerOptions)
        jest.spyOn(updatedObserver, 'disconnect')
        jest.spyOn(updatedObserver, 'unobserve')

        // Note: useIntersectionObserver shouldn't disconnect() when observerOptions.root === document
        // Note: the mock of IntersectionObserver add a wheel event listener on root and removes it when disconnected
        // Note: onEnter() and onExit() would be called if the update was on a useIntersectionObserver's option
        if (observerOptions.root === document) {
            expect(observerOptions.root.removeEventListener).toHaveBeenCalledTimes(events.length)
            expect(observerOptions.root.addEventListener).toHaveBeenCalledTimes(events.length)
        } else {
            expect(observer.disconnect).toHaveBeenCalledTimes(1)
            expect(observerOptions.root.removeEventListener).toHaveBeenCalledTimes(events.length + 1)
            expect(observerOptions.root.addEventListener).toHaveBeenCalledTimes(events.length + 1)
            expect(onEnter).toHaveBeenCalledTimes(1)
            expect(onExit).toHaveBeenCalledTimes(targets.length - 1)
        }
    })

    it('unobserves an unmounting target', () => {

        act(() => {
            targets = targets.slice(0, targets.length - 1)
            render(
                <Test
                    beforeScroll={beforeScroll}
                    targets={targets}
                    onEnter={onEnter}
                    onExit={onExit} />,
                container)
        })

        expect(updatedObserver.unobserve).toHaveBeenCalledTimes(1)
    })

    it('disconnects an observer when root is unmounting', () => {

        act(() => {
            render(null, container)
        })

        // Note: see notes in 4.
        if (observerOptions.root === document) {
            expect(observers.get(observerOptions)).toBeInstanceOf(IntersectionObserver)
            expect(observerOptions.root.removeEventListener).toHaveBeenCalledTimes(events.length)
        } else {
            expect(updatedObserver.disconnect).toHaveBeenCalledTimes(1)
            expect(observers.get(observerOptions)).toBeUndefined()
            expect(observerOptions.root.removeEventListener).toHaveBeenCalledTimes(events.length + 1)
        }
    })
})
