
import React from 'react'

/**
 * useLazyStateUpdate :: a -> Number -> a
 */
const useLazyStateUpdate = (initialState, delay = 100) => {

    const [state, set] = React.useState(initialState)

    React.useEffect(() => {

        if (state === initialState) return

        const id = setTimeout(() => set(initialState), delay)

        return () => clearTimeout(id)

    }, [delay, initialState, state])

    return state
}

export default useLazyStateUpdate
