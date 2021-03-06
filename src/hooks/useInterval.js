
import React from 'react'

/**
 * useInterval :: ((x -> x) -> Number) -> void
 *
 * Credit: Dan Abramov
 * https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 */
const useInterval = (fn, delay) => {

    const ref = React.useRef()

    React.useEffect(() => { ref.current = fn }, [fn]) // eslint-disable-line brace-style
    React.useEffect(() => {
        if (typeof delay === 'undefined') return
        const id = setInterval(ref.current, delay)
        return () => clearInterval(id)
    }, [delay])
}

export default useInterval
