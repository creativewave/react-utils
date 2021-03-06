
import React from 'react'
import shallowEqual from '../lib/shallowEqual.js'

/**
 * useGatherMemo :: (Object -> ...String|Symbol) -> [a, Object]
 */
const useGatherMemo = (object, ...props) => {

    const ref = React.useRef(object)
    const rest = React.useRef({})

    if (!shallowEqual(ref.current, object)) {
        ref.current = object
        rest.current = {}
    }

    return React.useMemo(
        () => Object.keys(ref.current).reduce(
            (gather, key) => {
                if (props.includes(key)) return gather
                gather[gather.length - 1][key] = ref.current[key]
                return gather
            },
            props.map(prop => ref.current[prop]).concat(rest.current)),
        [ref, props])
}

export default useGatherMemo
