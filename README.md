
# React Utils

This package contains common hooks and components to use in a React application.

**Hooks**

- [`useAnimate`](#useAnimate)
- [`useAnimateCustom`](#useAnimateCustom)
- [`useIntersectionObserver`](#useIntersectionObserver)
- [`useInterval`](#useInterval)
- [`useGatherMemo`](#useGatherMemo)
- [`useLazyStateUpdate`](#useLazyStateUpdate)
- [`useMediaQuery`](#useMediaQuery)
- [`useScrollIntoView`](#useScrollIntoView)
- [`useSVGMousePosition`](#useSVGMousePosition)
- [`useTimeout`](#useTimeout)
- [`useTransition`](#useTransition)
- [`useValidation`](#useValidation)

**Components**

- [`<Filter>`](#Filter)

***

**(Hooks)**

## useAnimate

`useAnimate` abstracts using `Element.animate()`, provided by the Web Animation API ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)), and cancels an animation if it's still running when the component unmouts.

`useAnimate :: Ref -> Animate`

`Animate` is a `Function` that has the following signature: `Animate :: (Keyframes -> Options) -> Animation`.

It will return an `Animation` extended with `.then()`, to chain another animation or just execute a simple callback when the previous animation is finished.

`Animation` [(W3C)](https://drafts.csswg.org/web-animations/#the-animation-interface) will be updated each time `animate()` is called.

**Example:**

```js
    const ref = React.useRef()
    const [animate, animation] = useAnimate(ref.current)

    const onHover = () => animate(
        // Animate color from red to green in 2s
        { color: ['red', 'green'] },
        { duration: 2000, fill: 'forwards' })
            .then(() => animation.reverse())
            // Then animate back to red in 2s

    return <h1 ref={ref}>red -> green -> orange -> green</h1>
```

## useAnimateCustom

`useAnimateCustom` abstracts using `animate()`, a lightweight alternative to `Element.animate()`, which is provided by the [Web Animation API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)), or to its [official polyfill](https://github.com/web-animations/web-animations-js), with some extra features.

**Note:** this hook relies on [`@cdoublev/animate`](https://github.com/creativewave/animate) as a peer dependency.

`useAnimateCustom :: Ref -> [Animate, Animation]`

`Ref` is a React reference object containing an `Element`, ie. `Ref => { current: Element }`.

`Animate` is a `Function` that has the following signature: `Animate :: (Keyframes -> Options) -> Animation`.

`Animate` accepts custom `easing` and interpolation functions to create animations that would be hard to achieve or can't be achieved using the Web Animation API:
- animating values overshooting (bouncing) multiple times across a keyframes interval or a whole iteration
- animating a property describing a list of values (eg. `transform` or `d`), by interpolating each entry independently
- animating a value that is not animatable (eg. `innerText`)

`Animation` conforms to the native `Animation` [(W3C)](https://drafts.csswg.org/web-animations/#the-animation-interface)  and it will be automatically cancelled if it's still running when the component unmouts.

**Example (custom easing):**

```js
    const ref = React.useRef()
    const [animate, animation] = useAnimate(ref)

    const bounce = t => ((0.04 - (0.04 / t)) * Math.sin(25 * t)) + 1
    const onHover = () => animate(
        { opacity: [0, 1] },
        { duration: 2000, easing: bounce })

    return <h1 ref={ref}>Opacity 0 -> bounce to 1</h1>
```

**Example (custom interpolation):**

```js
    import {
        interpolateTaggedNumbers as interpolate,
        setProperty as set,
        tag,
  } from '@cdoublev/animate'

    const ref = React.useRef()
    const [animate, animation] = useAnimate(ref)

    const onHover = () => animate(
        {
            transform: [
                { interpolate, value: tag`translateX(${0}px) scale(${0.5})` },
                { interpolate, value: tag`translateX(${100}px) scale(${1})` },
            ],
            innerText: [
                { set, value: 0 },
                { set, value: 100 },
            ],
        },
        2000)

    return <h1 ref={ref}>0 to 100</h1>
```

Check [the README of `@cdoublev/animate`](https://github.com/creativewave/animate) to learn more about its usage.

Related:
- [React Spring](https://www.react-spring.io/)
- [(React) Framer Motion](https://www.framer.com/api/motion/)
- [Tween.js](https://github.com/tweenjs/tween.js)

## useIntersectionObserver

`useIntersectionObserver` abstracts using an `IntersectionObserver` to execute a function when an `Element` intersects an ancestor, ie. when it enters in or exit from its ancestor's viewport.

`useIntersectionObserver :: Configuration -> [CallbackRef, CallbackRef]`

The first [`CallbackRef`](https://reactjs.org/docs/refs-and-the-dom.html#callback-refs) should be used to define `root`, ie. the ancestor containing the `Element`s to observe, defined with the second callback ref.

Both should be used, either as a `ref` property in the corresponding component or executed directly with a reference to an `Element`. `root` will be `document` when it's set to `null`. You shouldn't worry about its execution on each update of the component, or when it unmounts.

**Configuration:**

- `rootMargin` and `threshold` are two of the three `IntersectionObserver` options ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver#Parameters)), the third being `root`
- `onEnter` and `onExit` are optional callbacks executed with the arguments received from the `IntersectionObserver` callback when an `Element` enters in or exits from its ancestor's viewport
- `once` is an optional `Boolean` to unobserve an `Element` after its first entrance

**Note:** make sure to assign static/memoized functions to `onEnter()`/`onExit()`, otherwise observe/unobserve effect/cleanup will run on each update of the component that uses this hook.

A single observer is created for each unique set of intersection options, and each observed `Element` will be automatically unobserved before unmounting or (opt-in) after its first entrance.

## useInterval

*Credit: [Dan Abramov](https://overreacted.io/making-setinterval-declarative-with-react-hooks/).*

`useInterval` abstracts using `setInterval()` and `clearInterval()` to schedule and repeat the execution of a function over time, without worrying about cancelling the timer to avoid a memory leak such as *a React state update on an unmounted component*.

`useInterval :: [Function, Number] -> void`

It will stop executing `Function` if:
- the component unmounts
- the reference to `Function` has changed
- the delay (`Number`) has changed

## useGatherMemo

`useGatherMemo` abstracts merging, gathering, and/or picking properties from object(s), and memoizing the result, ie. by preserving reference(s).

It's a low level hook that can be usefull eg. when you want to merge options or props received in a hook or a component with a large default options object, instead of listing each option argument with a default value and/or listing each one as dependencies of a hook.

`useGatherMemo :: (Object -> ...String|Symbol) -> [a, Object]`

**Example:**

```js
    const options = { color: 'red', size: 'large' }

    // 1. Pick prop(s) and gather the rest
    //    Both constants will be defined with a memoized value/reference,
    //    if `options` shallow equals its previous render value
    const [color, subOptions] = useGatherMemo(options, 'color')
    /*   { color, ...rest } = options */
    console.log(color, subOptions) // 'red' { size: 'large' }

    // 2. Merge properties
    //    `allOptions` will be defined with a memoized reference,
    //    if `subOptions` shallow equals its previous render value
    const allOptions = useGatherMemo({ ...subOptions, display: 'fullscreen' })
    console.log(allOptions) // { size: 'large', display: 'fullscreen' }
```

**Warning:** don't over use it, ie. use it only with large objects, otherwise it will negatively impact performances by increasing the call stack as well as the amount of data stored in memory.

## useLazyStateUpdate

`useLazyStateUpdate` abstracts delaying a state update.

Give it a state value and a delay (default to `100` ms) and it will update the component and return the corresponding state when `delay` is over.

It could be used eg. to delay the render of an error notice after validating an input value updated on each user input.

`useLazyStateUpdate :: [a, Number] -> a`

## useMediaQuery

`useMediaQuery` abstracts using `windows.matchMedia()` to observe a match against a query, eg. `(min-width: 50em)`.

`useMediaQuery :: String -> Boolean`

## useScrollIntoView

`useScrollIntoView` abstracts using `Element.scrollIntoView()` when a `scroll` event is emitted.

Depending on the scroll direction, it prevents the native scroll event and scrolls into view the next or previous `Element` of the given collection.

It also abstracts using `IntersectionObserver` to execute a `Function` when an `Element` enters in or exits from an ancestor `Element`. `IntersectionObserver` is also used to set the previous/next `Element` to scroll into view when the `Element` scrolled into view enters in its ancestor's viewport.

`useScrollIntoView :: Configuration -> [CallbackRef, CallbackRef]`

The first [`CallbackRef`](https://reactjs.org/docs/refs-and-the-dom.html#callback-refs) should be used to define `root`, ie. the ancestor `Element` that contains target `Element`s to scroll into view, defined using the second callback ref.

Both should be used, either as as a `ref` property in the corresponding component, or executed directly with a reference to the corresponding `Element`. `root` will be `document` when it's set to `null`. You shouldn't worry about its execution on each update of the component, or when it unmounts.

**Configuration:**

- `beforeScroll` is an optional callback executed before scrolling, which can be used to set the `Element` to scroll into view (by returning its index value in `targets`) or eg. to set a CSS transition classname before scrolling, and receiving as arguments (1) the index of the target that will be scrolled into view, (2) the current target index and (3) the scrolling direction  (`up` or `down`)
- `delay` (default to `200` ms) is a timeout value before scrolling
- `wait` (default to `1000` ms) is a timeout value between two authorized scroll events
- `mode` (default to `auto`) is the [scrolling behavior](https://drafts.csswg.org/cssom-view/#smooth-scrolling)
- `onEnter` and `onExit` are optional callbacks defined in [`useIntersectionObserver`](#useIntersectionObserver)

## useSVGMousePosition

`useSVGMousePosition` abstracts translating the position of the mouse relative to an `SVGElement` in `document`, into a position relative to its `viewBox`.

It could be used eg. to change the position of a child `SVGElement` (paths, filters, clips, masks, gradients, etc...) when hovering its root `SVGElement`.

`useSVGMousePosition :: Configuration -> [Position, CallbackRef, CallbackRef]`

`Position` represents the coordinates of the mouse in the `SVGElement`, relative to its `viewBox`: `Position => { x: Float, y: Float }`.

The first [`CallbackRef`](https://reactjs.org/docs/refs-and-the-dom.html#callback-refs) can be used to define either `root` or the `SVGElement`. The latter can also be defined with the second callback ref.

Using both callbacks is usefull to listen for `mousemove` events in an ancestor `Element` different than `document`, but note that `Position` will always be computed relative to `document`.

**Note:** the `SVGElement` should preserve its aspect ratio, otherwise `Position` will be incorrect, as the current implementation is using `Element.getBoundingClientRect()` to compute its dimensions.

**Configuration:**

- `thresold` (default to `1`) is an optional number to "expand" or "shrink" the `target` box layout area, ie. its [`DOMRect`](https://developer.mozilla.org/en-US/docs/Web/API/DOMRect)
- `inital` (default to `{ x: 0, y: 0 }`) is an optional initial position
- `shouldListen` (default to `true`) is an optional `Boolean` to "mute" the `mousemove` event listener while it's `false`
- `isFixed` (default to `false`) is an optional `Boolean` to flag the `target` as having a fixed position
- `precision` (default to `2`) is an optional number to round `Position` values

## useTimeout

`useTimeout` abstracts using `setTimeout()` and `clearTimeout()` to schedule the execution of a `Function`, without worrying about cancelling the timer to avoid a memory leak such as *a React state update on an unmounted component*.

`useTimeout :: [Function, Number] -> void`

It will stop executing `Function` if:
- the component unmounts
- the reference to `Function` has changed
- the delay (`Number`) has changed

## useTransition

`useTransition` abstracts scheduling multiple state updates over time using different delays and durations.

It will always return the current state as a collection, which can be conceptualized as a box whose values are entering and exiting in and out over time. It can be used eg. to transition between CSS classnames when a component did mount or before unmouting.

`useTransition :: { transitions: [Transition], onExit?: Transition } -> [[a], Restart, Exit?, Boolean?, Enter?]`

A `Transition` (`[a, Number, Number?]`) is a collection of a state value (`a`) and one or two `Number`s: the first value is the delay before applying the given state, and the second value is the duration during which it should be applied, except for the `Transition` defined on `onExit`, defined only with a duration.

**Note:** `transitions` should be memoized, otherwhise the inital state will always be applied.

`Exit`, `Enter`, and the `Boolean` are returned only when `onExit` is provided. `Exit` is a `Function` to execute the `Transition` defined on `onExit` before toggling the `Boolean` value to `false`, indicating that the component can be considered as unmounted. `Enter` is a `Function` to toggle this value back to `true`.

**Demo:** [CodePen](https://codepen.io/creative-wave/pen/vMRRWd).

Related packages:
- [React Transition Group](https://github.com/reactjs/react-transition-group)
- [React Spring (useTransition)](https://www.react-spring.io/docs/hooks/use-transition)

## useValidation

`useValidation` abstracts using the Constraint Validation API ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Constraint_validation)) to validate a form field on blur (default) or on change.

`useValidation :: { onChange?: Function, onBlur?: Function, validateOnChange?: Boolean } -> [String, Props]`

It returns any error message from the Constraint Validation API, and a collection of component properties such as `onChange` and `onBlur` event handlers, to assing to an `<input>`, `<select>` or `<textarea>`. Each of those handlers will be composed with a corresponding handler given as argument.

***

**(Components)**

### <Filter>

`<Filter>` provides common filter effects to use in a `SVGElement`. Each filter effect is indentified by a `name` property.

**List of effects and their props:**

| Id           | Props                                                          |
| ------------ | -------------------------------------------------------------- |
| glow         | blur, spread, lightness, opacity                               |
| glow-inset   | blur, thresold, lightness, opacity                             |
| gooey        | tolerance                                                      |
| noise        | frequency, blend, color (default to black), lightness, opacity |
| shadow       | offsetX, offsetY, blur, spread, opacity                        |
| shadow-inset | offsetX, offsetY, blur, thresold, opacity                      |

All prop are `Number`s or numerical `String`s except for the `blend` prop of the noise filter, which should be a CSS blend mode (`String`).

Lightness always default to `0`, ie. with no white or black mixed in, and opacity always default to `0.5`.

Using a single filter effect (ie. it should not have a `in` or `result` prop):

```js
    <Filter id='glow-large' name='glow' blur='10' spread='3' opacity='0.3' />
    <Filter id='glow-small' name='glow' blur='5'  spread='2' opacity='0.7' />
```

**Note:** `id` will default to `name` if not provided.

Composing filter effects (ie. it should have a `in` and/or a `result` prop):

```js
    <filter id='glow-noise' x='-100%' y='-100%' height='300%' width='300%'>
        <Filter name='glow' blur='10' spread='3' result='glow' />
        <Filter name='noise' in='glow' opacity='0.2' frequency='0.2' />
    </filter>
```
