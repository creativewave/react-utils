
import PropTypes from 'prop-types'
import React from 'react'

const NumberOrString = PropTypes.oneOfType([PropTypes.string, PropTypes.number])

/**
 * ColorCorrection :: Props -> React.Element
 */
const ColorCorrection = ({ lightness = 0, opacity = 0.5 }) =>
    <feColorMatrix values={`1 0 0 0 ${lightness}  0 1 0 0 ${lightness}  0 0 1 0 ${lightness}  0 0 0 ${opacity} 0`} />

ColorCorrection.propTypes = {
    lightness: NumberOrString,
    opacity: NumberOrString,
}

/**
 * Glow :: Props -> React.Element
 *
 * Memo: a glow should cast a bright light using the same tint as the graphic
 * source, with a higher luminosity and a lower saturation, ie. blended over the
 * graphic source using the screen `mode` of `<feBlend>`.
 *
 * Memo: multiple glows can be stacked to get a more realistic result, using
 * different values and direction, ie. a pair of two different values for
 * `radius`.
 */
const Glow = props =>
    <>
        <feMorphology in={props.in} operator='dilate' radius={props.spread} />
        <feGaussianBlur stdDeviation={props.blur} />
        <ColorCorrection lightness={props.lightness} opacity={props.opacity} />
        <feBlend in='SourceGraphic' mode='screen' result={props.result} />
    </>

Glow.propTypes = {
    ...ColorCorrection.propTypes,
    blur: NumberOrString.isRequired,
    in: PropTypes.string,
    result: PropTypes.string,
    spread: NumberOrString.isRequired,
}

/**
 * GlowInset :: Props -> React.Element
 *
 * Memo: an inset glow should cast a bright light from the center of the graphic
 * source, using the same tint with a higher luminosity and a lower saturation,
 * ie. blended over the graphic source using the screen `mode` of `<feBlend>`.
 */
const GlowInset = props =>
    <>
        <feMorphology in={props.in} operator='erode' radius={props.thresold} />
        <feGaussianBlur stdDeviation={props.blur} result='blur' />
        <ColorCorrection lightness={props.lightness} opacity={props.opacity} />
        <feBlend in='SourceGraphic' mode='screen' result={props.result} />
    </>

GlowInset.propTypes = {
    ...ColorCorrection.propTypes,
    blur: NumberOrString.isRequired,
    in: PropTypes.string,
    result: PropTypes.string,
    thresold: NumberOrString.isRequired,
}

/**
 * Gooey :: Props -> React.Element
 *
 * Memo: `stdDeviation` is used as a factor to increase the global alpha value
 * of the graphic source, and to raise it using its constant modifier, in order
 * to soften the outline of the graphic source.
 */
const Gooey = props =>
    <>
        <feGaussianBlur in={props.in} stdDeviation={props.tolerance} />
        <feColorMatrix mode='matrix' values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${props.tolerance * 4} -${props.tolerance * 2}`} />
        <feComposite in='SourceGraphic' operator='atop' result={props.result} />
    </>

Gooey.propTypes = {
    in: PropTypes.string,
    result: PropTypes.string,
    tolerance: NumberOrString.isRequired,
}

/**
 * Noise :: Props -> React.Element
 *
 * Memo: `blend` and `color` can be used to create other textures that can be
 * generated using Perlin noise, like dust, grain, water, etc... .
 */
const Noise = ({ blend = 'multiply', color = 'black', ...props }) =>
    <>
        <feTurbulence baseFrequency={props.frequency} result='noise' />
        <feFlood floodColor={color} />
        <ColorCorrection lightness={props.lightness} opacity={props.opacity} />
        <feComposite in2='noise' operator='in' />
        <feComposite in={props.in} operator='in' />
        <feBlend in={props.in} mode={blend} result={props.result} />
    </>

Noise.propTypes = {
    ...ColorCorrection.propTypes,
    blend: PropTypes.string,
    color: PropTypes.string,
    frequency: NumberOrString.isRequired,
    in: PropTypes.string,
    lightness: NumberOrString,
    opacity: NumberOrString,
    result: PropTypes.string,
}

/**
 * shadow :: Props -> React.Element
 *
 * Memo: ideally, a shadow should cast a light using the same tint as the object
 * it covers, with a lower luminosity and a higher saturation, ie. blended over
 * the graphic source using the multiply `mode` of `<feBlend>`, but SVG filters
 * can be blended only with their single graphic source object. A partial
 * workaround would be to use a copy of the graphic source, apply a shadow and
 * render only  the pixels outside of the graphic source, and finally define
 * `mix-blend-mode: multiply`.
 *
 * Memo: we can't compose the graphic source `out` of the shadow, as the offset
 * will result in transparent pixels between the graphic source and its shadow.
 *
 * Memo: don't use this filter alone, as it's non-sense to use JavaScript to
 * apply a filter already available and optimized as a CSS function.
 */
const Shadow = ({ offsetX = 0, offsetY = 0, ...props }) =>
    <>
        <feMorphology in={props.in} operator='dilate' radius={props.spread} />
        <feGaussianBlur stdDeviation={props.blur} result='blur' />
        <feFlood floodColor='black' />
        <feComposite in2='blur' operator='in' />
        <ColorCorrection opacity={props.opacity} />
        <feOffset dx={offsetX} dy={offsetY} />
        <feComposite in={props.in} result={props.result} />
    </>

Shadow.propTypes = {
    blur: NumberOrString.isRequired,
    in: PropTypes.string,
    offsetX: NumberOrString,
    offsetY: NumberOrString,
    opacity: NumberOrString,
    result: PropTypes.string,
    spread: NumberOrString.isRequired,
}

/**
 * ShadowInset :: Props -> React.Element
 *
 * Memo: an inset shadow should cast a dark light using the same tint as the
 * graphic source, with a lower luminosity and a higher saturation, ie. blended
 * over the graphic source using the multiply `mode` of `<feBlend>`.
 */
const ShadowInset = ({ offsetX = 0, offsetY = 0, ...props }) =>
    <>
        <feMorphology in={props.in} operator='dilate' radius={props.thresold} />
        <feGaussianBlur stdDeviation={props.blur} />
        <ColorCorrection lightness={props.lightness} opacity={props.opacity} />
        <feOffset dx={offsetX} dy={offsetY} />
        <feComposite in='SourceGraphic' operator='out' />
        <feBlend in='SourceGraphic' mode='multiply' result={props.result} />
    </>

ShadowInset.propTypes = {
    ...ColorCorrection.propTypes,
    blur: NumberOrString.isRequired,
    in: PropTypes.string,
    offsetX: NumberOrString,
    offsetY: NumberOrString,
    result: PropTypes.string,
    thresold: NumberOrString.isRequired,
}

/**
 * Primitives => { [FilterID]: Props -> React.Element }
 */
const primitives = {
    'color-correction': ColorCorrection,
    'glow': Glow,
    'glow-inset': GlowInset,
    'gooey': Gooey,
    'noise': Noise,
    'shadow': Shadow,
    'shadow-inset': ShadowInset,
}

/**
 * Filter :: Props -> React.Element
 *
 * Props => { name: String, [SVGFeAttribute]: SVGFeAttributeValue }
 *
 * It should not wrap the filter primitive inside a `<filter>` container if a
 * previous `in` or a following `result` filter primitive id is given as prop.
 *
 * Memo: the first primitive doesn't require a `in` prop, as it will default to
 * `SourceGraphic` natively.
 */
const Filter = ({ id, name, ...props }) => {

    if (props.in || props.result) {
        return primitives[name](props)
    }

    const { height, width, x, y } = id === 'glow'
        ? { height: '300%', width: '300%', x: '-100%', y: '-100%' }
        : { height: '200%', width: '200%', x: '-50%', y: '-50%' }

    return <filter id={id || name} x={x} y={y} width={width} height={height}>{primitives[name](props)}</filter>
}

Filter.propTypes = {
    id: PropTypes.string,
    in: PropTypes.string,
    name: PropTypes.oneOf(Object.keys(primitives)),
    result: PropTypes.string,
}

export default Filter
