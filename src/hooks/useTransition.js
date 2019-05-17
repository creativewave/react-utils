
import React from 'react'

/**
 * useTransition :: { transitions: [Transition], onExit: [Transition] }
 *               -> [State, Restart, Exit, Boolean, Enter]
 *
 * Transition => [a, Number, Number?]
 * State => [a]
 * Restart => Exit => Enter => void -> void
 *
 * Memo(1): the only way to execute a transition before unmounting is to delay
 * the function that triggers this event. An `isMounted` state value is returned
 * to render the component (or eg. `null`), as well as an `exit` function to
 * toggle `isMounted` after the `Transition` defined on `onExit`.
 *
 * Memo(2): preserving the same reference of `transitions` is the responsibility
 * of the component, which is a better tradeoff than using/parsing/memoizing a
 * primitive (string) value.
 *
 * Alternative using a `ref`erence and a HOC:
 * https://github.com/react-spring/react-spring/blob/master/src/useTransition.js
 */
const useTransition = ({ transitions, onExit }) => {

    const initialState = React.useMemo(
        () => transitions.reduce((state, [a, delay]) => {
            if (delay === 0) state.push(a)
            return state
        }, []),
        [transitions])
    const [state, setState] = React.useState(initialState)
    const [isMounted, setIsMounted] = React.useState(true)
    const [i, restart] = React.useState(true)
    const { current: ids } = React.useRef([])
    const reset = React.useCallback(() => restart(i => !i), [restart])

    React.useEffect(() => {

        if (!isMounted) {
            return
        }

        transitions.forEach(([a, delay, duration]) => {
            if (delay > 0) {
                ids.push(setTimeout(() => setState(aa => aa.concat(a)), delay))
            }
            if (typeof duration === 'number') {
                ids.push(setTimeout(() => setState(aa => aa.filter(aa => aa !== a)), duration))
            }
        })

        return () => {
            ids.forEach(clearTimeout)
            setState(initialState)
        }

    }, [i, ids, initialState, isMounted, setState, transitions])

    if (onExit) {

        const [a, delay] = onExit
        const exit = () => {
            ids.forEach(clearTimeout)
            setState([a])
            setTimeout(() => setIsMounted(false), delay)
        }
        const enter = () => setIsMounted(true)

        return [state, reset, exit, isMounted, enter]
    }

    return [state, reset]
}

export default useTransition
