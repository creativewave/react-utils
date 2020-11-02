
import { useEffect, useState } from 'react'

/**
 * useInterval :: String -> Boolean
 */
const useMediaQuery = query => {

    const [hasMatch, setHasMatch] = useState(false)

    useEffect(() => {

        const list = window.matchMedia(query)
        const handleChange = ({ matches }) => setHasMatch(matches)

        handleChange(list)
        list.addListener(handleChange)

        return () => list.removeListener(handleChange)
    }, [query])

    return hasMatch
}

export default useMediaQuery
