
import React from 'react'

/**
 * useAnimate :: Ref -> (Keyframes -> Options) -> Animate
 *
 * Ref => { current: Element }
 * Animate :: (Keyframes -> Options?|Number?) -> Animation
 */
const useAnimate = ref => {

    const animation = React.useRef()
    const animate = React.useCallback(
        (keyframes, options) => {
            if (ref.current) {
                return animation.current = ref.current.animate(keyframes, options)
            }
        },
        [ref])

    React.useEffect(() => () => {
        if (animation.current?.playState === 'running') {
            animation.current.cancel()
        }
    }, [animation])

    return animate
}

export default useAnimate
