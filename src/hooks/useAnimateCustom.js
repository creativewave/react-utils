
import React from 'react'
import animate from '@cdoublev/animate'

/**
 * useAnimateCustom :: Ref -> (Keyframes -> Options) -> Animation
 *
 * Ref => { current: Element }
 */
const useAnimateCustom = ref => {

    const animation = React.useRef()
    const customAnimate = React.useCallback(
        (keyframes, options) => {
            if (ref.current) {
                return animation.current = animate(ref.current, keyframes, options)
            }
        },
        [ref])

    React.useEffect(() => () => {
        if (animation.current && animation.current.playState === 'running') {
            animation.current.cancel()
        }
    }, [animation])

    return customAnimate
}

export default useAnimateCustom
