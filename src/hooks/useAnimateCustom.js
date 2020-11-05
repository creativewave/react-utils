
import React from 'react'
import animate from '@cdoublev/animate'

/**
 * useAnimateCustom :: Ref -> (Keyframes -> Options) -> Animate
 *
 * Ref => { current: Element }
 * Animate :: (Keyframes|MotionPath -> Options?|Number?) -> Animation
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
        if (animation.current?.playState === 'running') {
            animation.current.cancel()
        }
    }, [animation])

    return customAnimate
}

export default useAnimateCustom
