
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

***

**(Hooks)**

## useIntersectionObserver

`useIntersectionObserver` abstracts using an `IntersectionObserver` to execute a function when a DOM element intersects a parent element.

`useIntersectionObserver :: Configuration -> void`

**Configuration:**

- `targets` (required) are references of `HTMLElement`s to observe
- `root`, `rootMargin`, and `threshold` are `IntersectionObserver` options ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver#Parameters))
- `onEnter` and `onExit` are optional callbacks executed with the arguments received from the `IntersectionObserver` callback, when an `HTMLElement` is intersecting or stops intersecting
- `once` is an optional `Boolean` to `unobserve` an `HTMLElement` after its first intersection

**Note:** make sure to use static/memoized functions for `onEnter`/`onExit`, otherwise they will trigger an observe/unobserve effect/cleanup on each update.

A single observer will be created for each unique set of intersection options (`root`, `rootMargin`, and `threshold`), and each observed element is automatically `unobserve`d before unmounting or (opt-in) after its first intersection.

## useInterval

*Credit: [Dan Abramov](https://overreacted.io/making-setinterval-declarative-with-react-hooks/).*

`useInterval` abstracts using `setInterval` and `clearInterval` to schedule and repeat the execution of a function over time, without worrying about cancelling the timer and avoiding a memory leak such as *a React state update on an unmounted component*.

`useInterval :: [Function, Number] -> void`

It will stop repeating the execution of the function if the component unmounts, or if the reference of the function or its delay has changed.

## useGatherMemo

`useGatherMemo` abstracts merging, gathering, and/or picking properties from object(s), and memoizing the result, ie. by preserving reference(s).

It's a low level hook which can be usefull eg. when you want to merge options or props received in a hook or a component, with a large default options object, instead of listing each option argument with a default value, and/or listing each one as a dependency of a hook (which should react to an update).

`useGatherMemo :: [Object, ...String|Symbol] -> [a, Object]`

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

Give it a state value that will be updated over time, and a delay (default to `100` ms), and it will return the corresponding state by delaying future updates.

It could be used eg. to delay the display of an error message coming from the validation of an input value updated on each change.

`useLazyStateUpdate :: [a, Number] -> a`

## useMediaQuery

`useMediaQuery` abstracts using `windows.matchMedia` to observe a match against a query, eg. `(min-width: 50em)`.

`useMediaQuery :: String -> Boolean`

## useScrollIntoView

`useScrollIntoView` abstracts using `Element.scrollIntoView()` when a `scroll` event is emitted.

By default, depending on the scroll direction, either it prevents the default event and scroll into view the next or previous element from a given collection of `HTMLElement`s, or the container element is normally scrolled by the user agent.

It also abstracts using `IntersectionObserver` to execute a function when an element intersects its container, ie. when it enters in or exits from its viewport.

`useScrollIntoView :: Configuration -> IntersectionObserverOptions -> void`

**Configuration:**

- `targets` (required) is a collection of `HTMLElement`s to scroll into view
- `root` (default to the document/viewport) is a reference of an optional container element
- `beforeScroll` is an optional callback which could be used eg. to set a CSS transition classname before scrolling, or to set the element to scroll into view by returning its index value, and which receive as arguments (1) the index of the target that will be scrolled into view, (2) the current target index and (3) the scrolling direction  (`up` or `down`)
- `delay` (default to `200` ms) is a timeout value before scrolling
- `wait` (default to `1000` ms) is a timeout value between two authorized scroll events
- `mode` (default to `auto`) is the [scrolling behavior](https://drafts.csswg.org/cssom-view/#smooth-scrolling)

**IntersectionObserverOptions:**

See [`useIntersectionObserver`](#useIntersectionObserver).

Juste note that touch/wheel events will be registered on the `HTMLElement` defined with `root` in `Configuration`.

## useTimeout

`useTimeout` abstracts using `setTimeout` and `clearTimeout` to schedule the execution of a function, without worrying about cancelling the timer and avoiding a memory leak such as *a React state update on an unmounted component*.

`useTimeout :: [Function, Number] -> void`

It will cancel its execution if the component unmounts, or if its reference or the delay has changed.

## useTransition

`useTransition` abstracts scheduling multiple state updates over time, with different delays and durations.

It will always return the current state as a collection, which can be conceptualized as a box whose values are entering and exiting in and out over time. It can be used eg. to transition between CSS classnames when a component is mounted or before unmouting.

`useTransition :: { transitions: [Transition], onExit?: Transition } -> [[a], Restart, Exit?, Boolean?, Enter?]`

A `Transition` (`[a, Number, Number?]`) is a collection of a state value (`a`), and one or two `Number`s: the first one is the delay before the given state is applied, and the second is the duration during which it should be applied, excepted for the `Transition` defined on `onExit`, which is defined only with a duration.

**Note:** `transitions` should be memoized, otherwhise the inital state will always be applied.

`Exit`, `Enter`, and the `Boolean` are returned only when `onExit` is provided. `Exit` is a function to execute the `Transition` defined on `onExit` before toggling the `Boolean` value to `false`, indicating that the component can be considered as unmounted. `Enter` is a function to toggle this value back to `true`.

**Demo:** [CodePen](https://codepen.io/creative-wave/pen/vMRRWd).

Related packages:
- [React Transition Group](https://github.com/reactjs/react-transition-group)
- [React Spring (useTransition)](https://www.react-spring.io/docs/hooks/use-transition)

## useValidation

`useValidation` abstracts using the Constraint Validation API [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Constraint_validation) to validate a form field on blur (default) or on change.

`useValidation :: { onChange?: Function, onBlur?: Function, validateOnChange?: Boolean } -> [String, Props]`

It returns any error message from the Constraint Validation API, and a collection of a component properties such as `onChange` and `onBlur` event handlers, which should be used on an `<input>`, `<select>` or `<textarea>`. Each of those handlers will be composed with any corresponding handler given as argument.

***

**(Components)**

### <Filter>

`<Filter>` provides common filter effects to use in a `<svg>`. Each filter effect is indentified by a `name` property.

**List of effects and their props:**

| Id           | Props                                                          |
| ------------ | -------------------------------------------------------------- |
| glow         | blur, spread, lightness, opacity                               |
| glow-inset   | blur, thresold, lightness, opacity                             |
| gooey        | tolerance                                                      |
| noise        | frequency, blend, color (default to black), lightness, opacity |
| shadow       | offsetX, offsetY, blur, spread, opacity                        |
| shadow-inset | offsetX, offsetY, blur, thresold, opacity                      |

All prop types are numbers, or strings representing numbers, except for the `blend` prop of the noise filter, which should be a CSS blend mode value (string).

Lightness always default to 0, ie. with no white or black mixed in, and opacity always default to 0.5.

Using a single filter effect (it should not have a `in` or `result` prop):

```js
    <Filter id='glow-large' name='glow' blur='10' spread='3' opacity='0.3' />
    <Filter id='glow-small' name='glow' blur='5'  spread='2' opacity='0.7' />
```

**Note:** `id` will default to `name` if not provided.

Composing filter effects (it should have a `in` and/or a `result` prop):

```js
    <filter id='glow-noise' x='-100%' y='-100%' height='300%' width='300%'>
        <Filter name='glow' blur='10' spread='3' result='glow' />
        <Filter name='noise' in='glow' opacity='0.2' frequency='0.2' />
    </filter>
```
