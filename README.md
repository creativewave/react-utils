
[![CircleCI](https://circleci.com/gh/creativewave/react-utils.svg?style=svg)](https://circleci.com/gh/creativewave/react-utils)

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

`useAnimate` abstracts using `Element.animate()` from the Web Animation API ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)).

`useAnimate :: Ref -> Animate`

`Ref` should be a React reference object containing an `Element`, ie. `Ref => { current: Element }`.

`Animate` is a `Function` that has the following signature: `Animate :: (Keyframes -> Options?|Number?) -> Animation`.

`Animation` [(W3C)](https://drafts.csswg.org/web-animations/#the-animation-interface) will be cancelled if it's still running when the component unmounts.

**Example:** [CodePen](https://codepen.io/creative-wave/pen/JjjZRyE)

## useAnimateCustom

`useAnimateCustom` abstracts using `animate()`, a lightweight alternative to [`Element.animate()`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) or its [official polyfill](https://github.com/web-animations/web-animations-js), with some [extra features](https://github.com/creativewave/animate#extra-features).

**Note:** this hook relies on [`@cdoublev/animate`](https://github.com/creativewave/animate) as an optional dependency to install manually.

`useAnimateCustom :: Ref -> Animate`

`Ref` should be a React reference object containing an `Element`, ie. `Ref => { current: Element }`.

`Animate` is a `Function` that has the following signature: `Animate :: (Keyframes|MotionPath -> Options?|Number?) -> Animation`.

`Animation` conforms to the native `Animation` [(W3C)](https://drafts.csswg.org/web-animations/#the-animation-interface). It will be cancelled if it's still running when the component unmouts.

**Example:** [CodePen](https://codepen.io/creative-wave/pen/YzzvGxE)

Related:
- [React Spring](https://www.react-spring.io/)
- [(React) Framer Motion](https://www.framer.com/api/motion/)
- [Tween.js](https://github.com/tweenjs/tween.js)

## useIntersectionObserver

`useIntersectionObserver` abstracts using an `IntersectionObserver` to execute a function when an `Element` intersects an ancestor, ie. when it enters in or exits from its viewport.

`useIntersectionObserver :: Configuration -> [CallbackRef, Identifier -> CallbackRef, Ref]`

The first [`CallbackRef`](https://reactjs.org/docs/refs-and-the-dom.html#callback-refs) should be used to define `root`, ie. an ancestor containing the `Element`s to observe, defined with the second callback ref obtained by executing the higher order function with an `Identifier` (`String|Number|Symbol`) for each `Element` to observe.

Both should be used. `root` will default to `null` (ie. [`document`](https://w3c.github.io/IntersectionObserver/#intersectionobserver-intersection-root)) when the corresponding callback ref is executed without an argument. `null` can't be used to set `root` to `document` because React will execute the callback ref with `null` before unmount, if it's used as a ref prop.

`Ref` is a React object ref containing the current `IntersectionObserver`. It can be used eg. to manually unobserve a target after a first intersection.

Each observed `Element` will be unobserved before unmount, and the current `IntersectionObserver` will be disconnected before `root` unmounts, except if `root` corresponds to `document`, as it could be shared with other components. Only one `IntersectionObserver` will be created for each unique set of intersection options.

**Example:** [CodePen](https://codepen.io/creative-wave/pen/bGbwxRO)

**Configuration:**

- `rootMargin` and `threshold` are two of the three `IntersectionObserver` options ([W3C](https://w3c.github.io/IntersectionObserver/#dictdef-intersectionobserverinit)), the third being `root`
- `onEnter` and `onExit` are optional callbacks executed with the arguments received from the `IntersectionObserver` callback when an `Element` enters in or exits from the viewport of its ancestor

**Note:** make sure to use a memoized value for `threshold` if it's an `Array`, as well as for `onEnter` and `onExit`.

## useInterval

*Credit: [Dan Abramov](https://overreacted.io/making-setinterval-declarative-with-react-hooks/).*

`useInterval` abstracts using `setInterval()` and `clearInterval()` to schedule and repeat the execution of a function over time, without worrying about cancelling the timer to avoid a memory leak such as *a React state update on an unmounted component*.

`useInterval :: [Function, Number] -> void`

It will stop executing `Function` if:
- the component unmounts
- the reference to `Function` has changed
- the delay (`Number`) has changed

## useGatherMemo

`useGatherMemo` abstracts merging, gathering, and/or picking properties from object(s), while memoizing the result, ie. by preserving reference(s).

It's a low level hook that can be usefull eg. when you want to merge options or props received in a hook or a component with a large default options object, instead of listing each option argument with a default value and/or listing each one as a dependency of a hook.

`useGatherMemo :: (Object -> ...String|Symbol) -> [x, Object]`

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

Depending on the scroll direction, it prevents the default scroll behavior and scrolls into view the next or previous `Element`, on:

- ✅ touch (finger or stylus) move
- ✅ wheel (rolling)
- ❌ wheel (button)

`useScrollIntoView :: Configuration -> [CallbackRef, Identifier -> CallbackRef, Ref]`

The first [`CallbackRef`](https://reactjs.org/docs/refs-and-the-dom.html#callback-refs) should be used to define `root`, ie. an ancestor containing the `Element`s to scroll into view, defined with the second callback ref, obtained by executing the higher order function with a unique `Identifier` (`String|Number|Symbol`) for each `Element`.

Both should be used. To set `document` as `root`, the corresponding callback ref should be executed without an argument. See [`useIntersectionObserver`](#useIntersectionObserver) to know why, since this hook is used to set the previous/next `Element` to scroll into view when an `Element` enters in the viewport of `root`.

`Ref` is a React object ref containing the current `IntersectionObserver`.

**Example:**
- [CodePen](https://codepen.io/creative-wave/pen/jOOKMwo)
- [CodePen, both scroll directions](https://codepen.io/creative-wave/pen/WNbNRmx)

**Configuration:**

- `beforeScroll` is an optional callback executed before scrolling, that can be used to set the `Element` to scroll into view (by returning its index value in `targets`) or eg. to set a CSS transition classname before scrolling, and receiving as arguments (1) the index of the target that will be scrolled into view, (2) the current target index and (3) the scrolling direction  (`up`, `down`, `left`, or `right`)
- `delay` (default to `200` ms) is a timeout value before scrolling
- `directions` (default to `both`) is the scroll direction to listen on (`x`, `y`, or `both`)
- `wait` (default to `1000` ms) is a timeout value between two authorized scroll events
- `mode` (default to `auto`) is the [scrolling behavior](https://drafts.csswg.org/cssom-view/#smooth-scrolling)
- `onEnter` and `onExit` are optional callbacks defined in [`useIntersectionObserver`](#useIntersectionObserver)
- `touchSensitivity` (default to `150`) is a distance in pixels that the finger or stylus should move to be handled as a scroll event

## useSVGMousePosition

`useSVGMousePosition` abstracts translating the position of the mouse relative to an `<svg>` in `document`, into a position relative to its `viewBox`.

It could be used eg. to animate the position of a child `SVGElement` (paths, filters, clips, masks, gradients, etc...).

`useSVGMousePosition :: Configuration -> [Position, CallbackRef, CallbackRef]`

`Position` are the coordinates of the mouse: `Position => { x: Float, y: Float }`.

The first [`CallbackRef`](https://reactjs.org/docs/refs-and-the-dom.html#callback-refs) should be used to define the `<svg>`. Using both callbacks is usefull to listen `mousemove` events in an ancestor `Element` containing the `<svg>` and animate the position of a child `SVGElement` outside of the `<svg>`.

**Note:** the `<svg>` should preserve its aspect ratio, otherwise `Position` will be incorrect, as the current implementation is using `Element.getBoundingClientRect()` to compute its dimensions.

**Example:** [CodePen](https://codepen.io/creative-wave/pen/VwwdKVX)

**Configuration:**

- `hasRoot` (default to `false`) is an optional boolean to make sure that the `mouseover` event listener will be registered only when the `<svg>` is mounted, eg. if it's conditionally rendered in its `root` component
- `initial` (default to `{ x: 0, y: 0 }`) is an optional initial position
- `isFixed` (default to `false`) is an optional `Boolean` to flag the `target` as having a fixed position in the viewport of `document`, ie. in `window`
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

`useTransition :: { transitions: [Transition], onExit?: Transition } -> [[x], Restart, Exit?, Boolean?, Enter?]`

A `Transition` (`[x, Number, Number?]`) is a collection of a state value (`x`) and one or two `Number`s: the first value is the delay before applying the given state, and the second value is the duration during which it should be applied, except for the `Transition` defined on `onExit`, defined only with a duration.

**Note:** `transitions` should be memoized, otherwhise the inital state will always be applied.

`Exit`, `Enter`, and the `Boolean` are returned only when `onExit` is provided. `Exit` is a `Function` to execute the `Transition` defined on `onExit` before toggling the `Boolean` value to `false`, indicating that the component can be considered as unmounted. `Enter` is a `Function` to toggle this value back to `true`.

**Demo:** [CodePen](https://codepen.io/creative-wave/pen/vMRRWd).

Related packages:
- [React Transition Group](https://github.com/reactjs/react-transition-group)
- [React Spring (useTransition)](https://www.react-spring.io/docs/hooks/use-transition)

## useValidation

`useValidation` abstracts using the Constraint Validation API ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Constraint_validation)) to validate a form field on blur (default) or on change.

`useValidation :: { onChange?: Function, onBlur?: Function, validateOnChange?: Boolean } -> [String, Props]`

It returns any error message from the Constraint Validation API, and a collection of component properties such as `onChange` and `onBlur` event handlers, to assign to an `<input>`, `<select>` or `<textarea>`. Each of those handlers will be composed with a corresponding handler given as argument.

***

**(Components)**

## Filter

`<Filter>` provides common filter effects to use in a `SVGElement`. Each filter effect is indentified by a `name` property.

**List of effects and their props:**

| Id           | Props                                                          |
| ------------ | -------------------------------------------------------------- |
| glow         | blur, spread, lightness, opacity                               |
| glow-inset   | blur, threshold, lightness, opacity                             |
| gooey        | tolerance                                                      |
| noise        | frequency, blend, color (default to black), lightness, opacity |
| shadow       | offsetX, offsetY, blur, spread, opacity                        |
| shadow-inset | offsetX, offsetY, blur, threshold, opacity                      |

All prop are `Number`s or numerical `String`s except for the `blend` prop of the noise filter, which should be a CSS blend mode (`String`).

Lightness always default to `1`, ie. with no white or black mixed in, and opacity always default to `0.5`.

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
