
import React from 'react'

/**
 * useTimeout :: ((x -> x) -> Number) -> void
 */
const useTimeout = (fn, delay) => {

    const ref = React.useRef()

    React.useEffect(() => { ref.current = fn }, [fn]) // eslint-disable-line brace-style
    React.useEffect(() => {
        if (typeof delay === 'undefined') return
        const id = setTimeout(ref.current, delay)
        return () => clearTimeout(id)
    }, [delay])
}

export default useTimeout
