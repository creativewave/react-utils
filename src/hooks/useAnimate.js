
import { useCallback, useEffect, useRef } from 'react'

/**
 * useAnimate :: Ref -> (Keyframes -> Options) -> Animate
 *
 * Ref => { current: Element }
 * Animate :: (Keyframes -> Options?|Number?) -> Animation
 */
const useAnimate = ref => {

    const animation = useRef()
    const animate = useCallback(
        (keyframes, options) => {
            if (ref.current) {
                return animation.current = ref.current.animate(keyframes, options)
            }
        },
        [ref])

    useEffect(() => () => {
        if (animation.current?.playState === 'running') {
            animation.current.cancel()
        }
    }, [animation])

    return animate
}

export default useAnimate
