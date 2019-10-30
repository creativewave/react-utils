
import React from 'react'

/**
 * useAnimate :: Ref -> [(Keyframes -> Options) -> Animation, Animation]
 *
 * Ref => { current: Element }
 *
 * It should abstract:
 *   `const [animation, setAnimation] = useState()`
 *   `e.animate(k, o).finished.then(() => setAnimation(e.animate(k, o)))`
 *   `const onClick = () => animation.cancel()`
 * into:
 *   `const [animate, animation] = useAnimation(e)`
 *   `animate(k, o).then(() => animate(k, o))`
 *   `const onClick = () => animation.cancel()`
 * and cancel `animation` if it's still running when the component unmounts.
 *
 * Memo: `animation.onfinish` is used instead of `animation.finished`, as the
 * latter isn't supported in all browsers yet (10/2019).
 */
const useAnimate = ref => {

    const [animation, setAnimation] = React.useState({})
    const animate = React.useCallback(
        (keyframes, options) => {
            if (!ref.current) {
                return
            }
            const animation = ref.current.animate(keyframes, options)
            animation.then = fn => new Promise(resolve => {
                animation.onfinish = () => resolve(fn(animation))
            })
            setAnimation(animation)
            return animation
        },
        [ref])

    React.useEffect(() => () => {
        if (animation.playState === 'running') {
            animation.cancel()
        }
    }, [animation])

    return [animate, animation]
}

export default useAnimate
