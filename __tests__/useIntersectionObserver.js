
import { render, unmountComponentAtNode } from 'react-dom'
import IntersectionObserver from '../src/lib/intersectionObserver'
import React from 'react'
import { act } from 'react-dom/test-utils'
import useIntersectionObserver from '../src/hooks/useIntersectionObserver'

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

it('observes intersections after using the callback refs in ref props of root and targets', () => {

    let observerInstance
    const Test = () => {

        const [rootIsMounted, setRootIsMounted] = React.useState(true)
        const [targetIsMounted, setTargetIsMounted] = React.useState(false)

        const [lastIn, setLastIn] = React.useState()
        const [lastOut, setLastOut] = React.useState()

        const onEnter = React.useCallback(entry => setLastIn(entry.target.id), [setLastIn])
        const onExit = React.useCallback(entry => setLastOut(entry.target.id), [setLastOut])
        const [setRoot, setTarget, observer] = useIntersectionObserver({ onEnter, onExit }, [onEnter, onExit])

        React.useEffect(() => {
            observerInstance = observer.current
            return () => observerInstance = observer.current
        })

        return (
            <div>
                {rootIsMounted ?
                <div ref={setRoot} id='root'>
                    <div ref={setTarget(1)} id='target-1'>
                        {lastIn === 'target-1' ? 'Last in'
                            : lastOut === 'target-1' ? 'Last out'
                                : 'Not in view'}
                    </div>
                    <div ref={setTarget(2)} id='target-2'>
                        {lastIn === 'target-2' ? 'Last in'
                            : lastOut === 'target-2' ? 'Last out'
                                : 'Not in view'}
                    </div>
                    <div ref={setTarget(3)} id='target-3'>
                        {lastIn === 'target-3' ? 'Last in'
                            : lastOut === 'target-3' ? 'Last out'
                                : 'Not in view'}
                    </div>
                    {targetIsMounted ?
                    <div ref={setTarget(4)} id='target-4'>
                        {lastIn === 'target-4' ? 'Last in'
                            : lastOut === 'target-4' ? 'Last out'
                                : 'Not in view'}
                    </div>
                    : null}
                </div>
                : null}
                <button id='toggle-target' onClick={() => setTargetIsMounted(!targetIsMounted)} />
                <button id='toggle-root' onClick={() => setRootIsMounted(!rootIsMounted)} />
            </div>
        )
    }

    // 1. Render
    act(() => {
        render(<Test />, container)
    })

    expect(observerInstance).toBeInstanceOf(IntersectionObserver)
    expect(container.querySelector('#target-1').textContent).toEqual('Last in')
    expect(container.querySelector('#target-2').textContent).toEqual('Not in view')
    expect(container.querySelector('#target-3').textContent).toEqual('Last out')

    // 2. Scroll down
    act(() => {
        container
            .querySelector('[id=root]')
            .dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }))
    })

    expect(container.querySelector('#target-1').textContent).toEqual('Last out')
    expect(container.querySelector('#target-2').textContent).toEqual('Last in')
    expect(container.querySelector('#target-3').textContent).toEqual('Not in view')

    // 3. Append a new target
    act(() => {
        container
            .querySelector('#toggle-target')
            .dispatchEvent(new Event('click', { bubbles: true }))
    })

    expect(container.querySelector('#target-4').textContent).toEqual('Last out')

    // 4. Unmount
    act(() => {
        container
            .querySelector('#toggle-root')
            .dispatchEvent(new Event('click', { bubbles: true }))
    })

    expect(observerInstance).toBeUndefined()
})

it('observes intersections after executing the callback ref to set document as root', () => {

    let observerInstance
    const Test = () => {

        const [lastIn, setLastIn] = React.useState()
        const [lastOut, setLastOut] = React.useState()

        const onEnter = React.useCallback(entry => setLastIn(entry.target.id), [setLastIn])
        const onExit = React.useCallback(entry => setLastOut(entry.target.id), [setLastOut])
        const [setRoot, setTarget, observer] = useIntersectionObserver({ onEnter, onExit }, [onEnter, onExit])

        React.useEffect(setRoot, [])

        React.useEffect(() => {
            observerInstance = observer.current
            return () => observerInstance = observer.current
        })

        return (
            <div>
                <div ref={setTarget(1)} id='target-1'>
                    {lastIn === 'target-1' ? 'Last in'
                        : lastOut === 'target-1' ? 'Last out'
                            : 'Not in view'}
                </div>
                <div ref={setTarget(2)} id='target-2'>
                    {lastIn === 'target-2' ? 'Last in'
                        : lastOut === 'target-2' ? 'Last out'
                            : 'Not in view'}
                </div>
                <div ref={setTarget(3)} id='target-3'>
                    {lastIn === 'target-3' ? 'Last in'
                        : lastOut === 'target-3' ? 'Last out'
                            : 'Not in view'}
                </div>
            </div>
        )
    }
    const Wrapper = () => {

        const [isMounted, setIsMounted] = React.useState(true)

        return (
            <div>
                <button id='toggle-component' onClick={() => setIsMounted(!isMounted)} />
                {isMounted ? <Test /> : null}
            </div>
        )

    }

    // 1. Render, create observer, observe targets
    act(() => {
        render(<Wrapper />, container)
    })

    expect(observerInstance).toBeInstanceOf(IntersectionObserver)
    expect(container.querySelector('#target-1').textContent).toEqual('Last in')
    expect(container.querySelector('#target-2').textContent).toEqual('Not in view')
    expect(container.querySelector('#target-3').textContent).toEqual('Last out')

    // 2. Scroll down and execute observer callback
    act(() => {
        container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 1 }))
    })

    expect(container.querySelector('#target-1').textContent).toEqual('Last out')
    expect(container.querySelector('#target-2').textContent).toEqual('Last in')
    expect(container.querySelector('#target-3').textContent).toEqual('Not in view')

    // 3. Unmount without removing (document) observer
    act(() => {
        container
            .querySelector('#toggle-component')
            .dispatchEvent(new Event('click', { bubbles: true }))
    })

    expect(observerInstance).toBeDefined()
})
