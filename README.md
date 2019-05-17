
# React Utils

This package contains common hooks and components to use in a React application.

**Hooks**

- [`useIntersectionObserver`](#useIntersectionObserver)
- [`useInterval`](#useInterval)
- [`useGatherMemo`](#useGatherMemo)
- [`useLazyStateUpdate`](#useLazyStateUpdate)
- [`useMediaQuery`](#useMediaQuery)
- [`useScrollIntoView`](#useScrollIntoView)
- [`useTimeout`](#useTimeout)
- [`useTransition`](#useTransition)
- [`useValidation`](#useValidation)

**Components**

- [`<Filter>`](#Filter)

## useIntersectionObserver

`useIntersectionObserver` abstracts using an `IntersectionObserver` to execute a function (such as a side effect or a state update) when an element intersects its container.

A single observer instance is created per unique set of intersection options, and each observed element is automatically `unobserve`d before unmounting or (opt-in) after its first intersection.

`useIntersectionObserver :: Options -> void`

**Options:**

- `targets` are references of `HTMLElement` to observe
- `root`, `rootMargin`, and `threshold` are the IntersectionObserver options ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver#Parameters))
- `onEnter` and `onExit` are callbacks executed with the arguments received from the `IntersectionObserver` when a given `HTMLElement` is intersecting or stops intersecting
- `once` will `unobserve` the observed `HTMLElement` after its first intersection

**Note:** make sure to use static/memoized functions for `onEnter` and `onExit`, otherwise they will trigger an observe/unobserve effect/cleanup on each update.

## useInterval

*Credit: [Dan Abramov](https://overreacted.io/making-setinterval-declarative-with-react-hooks/).*

`useInterval` abstracts using `setInterval` and `clearInterval` to schedule and repeat the execution of a function over time (such as a side effect or a state update), without worrying about timer cancellation and avoiding a memory leak such as *a React state update on an unmounted component*.

`useInterval :: [Function, Number] -> void`

It will stop repeating its execution if the component unmounts, or if its reference or the delay has changed.

## useGatherMemo

`useGatherMemo` abstracts gathering properties from an object and memoizing the result.

It's a low level hook which can be usefull eg. when you want to merge options or props received in a hook or a component, with a large object of default options, instead of listing each option as an argument with its default value.

`useGatherMemo :: [Object, ...String|Symbol] -> [a, Object]`

**Example:**

```js
    const options = { color: 'red', size: 'large' }

    // 1. Pick prop(s) and gather the rest: both will be defined with the same
    //    value/reference if options shallow equals its previous render value
    const [color, subOptions] = useGatherMemo(options, 'color')
    /*   { color, ...rest } = options */
    console.log(color, rest) // 'red' { size: 'large' }

    // 2. Merge: allOptions will be defined with the same object reference
    //    if rest has not changed since the previous render
    const allOptions = useGatherMemo({ ...rest, display: 'fullscreen' })
    console.log(allOptions) // { size: 'large', display: 'fullscreen' }
```

## useLazyStateUpdate

`useLazyStateUpdate` abstracts delaying a state update.

Give it a state value that will be updated over time, and a delay (default to `100`), and it will return the corresponding state by delaying its update during the given delay.

It could be used eg. to delay the display of an error message coming from the validation of an input value updated on each change.

`useLazyStateUpdate :: [a, Number] -> a`

## useMediaQuery

`useMediaQuery` abstracts using `windows.matchMedia` to observe a match against a query, eg. `(min-width: 50em)`.

`useMediaQuery :: String -> Boolean`

## useScrollIntoView

`useScrollIntoView` abstracts using `Element.scrollIntoView()` when a `scroll` event is emitted.

It should receive a collection of `HTMLElement`s, a reference of an optional `root` container element, and an optional `beforeScroll` callback to set the `HTMLElement` to scroll in to view. By default, depending on the scroll direction, it either prevents the default event and scroll into view the next or previous element from the `HTMLElement`s collection, or it does nothing, ie. the `root` container element is normally scrolled by the user agent.

It also abstracts using `useIntersectionObserver`, to execute a function when an element intersects its container, ie. when it enters in its viewport.

`useScrollIntoView :: Options -> IntersectionObserverOptions -> void`

**IntersectionObserverOptions:** see [`useIntersectionObserver`](#useIntersectionObserver). Juste note that touch/wheel events will be registered on the `HTMLElement` defined with its `root` option value. It will default to `document` (SSR supported).

**Options:**

- `targets` is the collection of `HTMLElement`s to scroll into view
- `beforeScroll` is a callback receiving (1) the index of the target that will be scrolled into view, which could be overriden by returning a custom index value, or to set a CSS transition classname, as well as (2) the current target index, and (3) the direction of the scroll/swipe, ie. `up` or `down`
- `delay` is the timeout value to use when scheduling the scroll (default to `200` ms)
- `wait` is the timeout value between two authorized scroll event (default to `1000` ms)
- `mode` is the [scrolling behavior](https://drafts.csswg.org/cssom-view/#smooth-scrolling) (default to `auto`)

## useTimeout

`useTimeout` abstracts using `setTimeout` and `clearTimeout` to schedule the execution of a function (such as a side effect or a state update), without worrying about timer cancellation and avoiding a memory leak such as *a React state update on an unmounted component*.

`useTimeout :: [Function, Number] -> void`

It will cancel its execution if the component unmounts, or if its reference or the delay has changed.

## useTransition

`useTransition` abstracts using `useTimeout` to schedule multiple state updates over time, with different delays and durations. It will always return the current state as a collection, which can be conceptualized as a box whose values are entering and exiting over time.

It can be used eg. to transition between CSS classnames when a component is mounted or before unmouting.

`useTransition :: { transitions: [Transition], onExit?: [Transition] } -> [[a], Restart, Exit?, Boolean?, Enter?]`

A `Transition` is a collection of a state value and one or two `Number`s. The first `Number` is the delay before the given state is applied, and the latter is the duration during which it should be applied. Exception: the `Transition` defined on `onExit` only contains a duration `Number`.

`Exit`, `Enter`, and the `Boolean` value are returned only when `onExit` is provided. `Exit` will execute the `Transition` defined on `onExit` before toggling the `Boolean` value to `false`, indicating that the component can be considered as unmounted. `Enter` will toggle this value back to `true`.

**Note:** `transitions` should be memoized, otherwhise the inital state will always be applied.

**Demo:** [CodePen](https://codepen.io/creative-wave/pen/vMRRWd).

Related packages:
- [React Transition Group](https://github.com/reactjs/react-transition-group)
- [React Spring (useTransition)](https://www.react-spring.io/docs/hooks/use-transition)

## useValidation

`useValidation` abstracts using the Constraint Validation API to validate a form field on blur (default) or on change.

`useValidation :: { onChange?: Function, onBlur?: Function, validateOnChange?: Boolean } -> [String, Props]`

It returns any error message from the Constraint Validation API, and a collection of a component properties such as `onChange` and `onBlur` event handlers, which should be used with an `<input>`, `<select>` or `<textarea>`. Each of those handlers will be composed with any corresponding handler given as an argument.

## Components

## <Filter>

`<Filter>` provides common filter effects to use in a `<svg>`. Each filter effect is indentified by an `id` property.

**List of effects and their props:**

| Id           | Props                                                          |
| ------------ | -------------------------------------------------------------- |
| glow         | blur, spread, lightness, opacity                               |
| glow-inset   | blur, thresold, lightness, opacity                             |
| gooey        | tolerance                                                      |
| noise        | frequency, blend, color (default to black), lightness, opacity |
| shadow       | offsetX, offsetY, blur, spread, opacity                        |
| shadow-inset | offsetX, offsetY, blur, thresold, opacity                      |

All prop types are numbers or strings representing numbers, except for the `blend` prop of the noise filter.

Lightness always default to 0, ie. no white or black mixed in, and opacity always default to 0.5.

Using a single filter effect (it should not have a `in` or `result` prop):

```js
    <Filter id='glow' blur='10' spread='3' opacity='0.7' />
```

Composing filter effects (it should have a `in` and/or a `result` prop):

```js
    <filter id='glow-noise' x='-100%' y='-100%' height='300%' width='300%'>
        <Filter id='glow' blur='10' spread='3' result='glow' />
        <Filter id='noise' in='glow' opacity='0.2' frequency='0.2' />
    </filter>
```
