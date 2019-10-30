
import React from 'react'
import animate from '@cdoublev/animate'

/**
 * useAnimateCustom :: Ref -> [Keyframes -> Options -> Animation, Animation]
 *
 * Ref => { current: Element }
 */
const useAnimateCustom = ref => {
    const [animation, setAnimation] = React.useState()
    const customAnimate = React.useCallback(
        (keyframes, options) => {
            if (!ref.current) {
                return
            }
            const animation = animate(ref.current, keyframes, options)
            setAnimation(animation)
            return animation
        },
        [ref])
    React.useEffect(() => () => {
        if (animation.playState === 'running') {
            animation.cancel()
        }
    }, [animation])
    return [customAnimate, animation]
}

export default useAnimateCustom
