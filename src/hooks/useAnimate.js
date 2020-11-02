
import React from 'react'

/**
 * useAnimate :: Ref -> (Keyframes -> Options) -> Animate
 *
 * Ref => { current: Element }
 * Animate :: (Keyframes -> Options?|Number?) -> Animation
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

    const animation = React.useRef()
    const animate = React.useCallback(
        (keyframes, options) => {
            if (!ref.current) {
                return
            }
            animation.current = ref.current.animate(keyframes, options)
            // eslint-disable-next-line compat/compat
            animation.current.then = fn => new Promise(resolve => {
                animation.current.onfinish = () => resolve(fn(animation.current))
            })
            return animation.current
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
