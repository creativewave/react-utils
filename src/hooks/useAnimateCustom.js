
import { useCallback, useEffect, useRef } from 'react'
import animate from '@cdoublev/animate'

/**
 * useAnimateCustom :: Ref -> (Keyframes -> Options) -> Animate
 *
 * Ref => { current: Element }
 * Animate :: (Keyframes|MotionPath -> Options?|Number?) -> Animation
 */
const useAnimateCustom = ref => {

    const animation = useRef()
    const customAnimate = useCallback(
        (keyframes, options) => {
            if (ref.current) {
                return animation.current = animate(ref.current, keyframes, options)
            }
        },
        [ref])

    useEffect(() => () => {
        if (animation.current?.playState === 'running') {
            animation.current.cancel()
        }
    }, [animation])

    return customAnimate
}

export default useAnimateCustom
