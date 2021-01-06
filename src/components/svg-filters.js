
import PropTypes from 'prop-types'
import React from 'react'

const NumberOrString = PropTypes.oneOfType([PropTypes.string, PropTypes.number])
const Percentage = (props, propName, componentName) => {
    if (props[propName] && !props[propName].endsWith('%')) {
        return new Error(`Invalid prop ${propName} supplied to ${componentName}. Validation failed.`)
    }
}

const RED_LUMINANCE = 0.2126
const GREEN_LUMINANCE = 0.7152
const BLUE_LUMINANCE = 0.0722

/**
 * ColorCorrection :: Props -> React.Element
 *
 * Memo: https://drafts.fxtf.org/filter-effects/#element-attrdef-fecolormatrix-values
 */
const ColorCorrection = ({ lightness = 1, opacity = 0.5, saturation = 1 }) => {

    const RR = RED_LUMINANCE + ((1 - RED_LUMINANCE) * saturation)
    const RG = GREEN_LUMINANCE - (GREEN_LUMINANCE * saturation)
    const RB = BLUE_LUMINANCE - (BLUE_LUMINANCE * saturation)

    const GR = RED_LUMINANCE - (RED_LUMINANCE * saturation)
    const GG = GREEN_LUMINANCE + ((1 - GREEN_LUMINANCE) * saturation)
    const GB = BLUE_LUMINANCE - (BLUE_LUMINANCE * saturation)

    const BR = RED_LUMINANCE - (RED_LUMINANCE * saturation)
    const BG = GREEN_LUMINANCE - (GREEN_LUMINANCE * saturation)
    const BB = BLUE_LUMINANCE + ((1 - BLUE_LUMINANCE) * saturation)

    const LIGHTNESS = 1 * (1 - lightness)

    return (
        <feColorMatrix values={`
            ${RR} ${RG} ${RB} ${LIGHTNESS} 0
            ${GR} ${GG} ${GB} ${LIGHTNESS} 0
            ${BR} ${BG} ${BB} ${LIGHTNESS} 0
            0 0 0 ${opacity} 0`} />
    )
}

ColorCorrection.propTypes = {
    lightness: NumberOrString,
    opacity: NumberOrString,
    saturation: NumberOrString,
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
        <feBlend in={props.in ?? 'SourceGraphic'} mode='screen' result={props.result} />
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
        <feMorphology in={props.in} operator='erode' radius={props.threshold} />
        <feGaussianBlur stdDeviation={props.blur} result='blur' />
        <ColorCorrection lightness={props.lightness} opacity={props.opacity} />
        <feBlend in={props.in ?? 'SourceGraphic'} mode='screen' result={props.result} />
    </>

GlowInset.propTypes = {
    ...ColorCorrection.propTypes,
    blur: NumberOrString.isRequired,
    in: PropTypes.string,
    result: PropTypes.string,
    threshold: NumberOrString.isRequired,
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
        <feComposite in2={props.in ?? 'SourceGraphic'} operator='in' />
        <feBlend in={props.in ?? 'SourceGraphic'} mode={blend} result={props.result} />
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
 * Memo: ideally, a shadow should cast a light using the same tint as objects
 * it covers, with a lower luminosity and a higher saturation, ie. blended over
 * them using the multiply `mode` of `<feBlend>`, but SVG filters can be blended
 * only with their single graphic source object. A partial workaround would be
 * to use a copy of the graphic source, blur it, render only the pixels outside
 * of the graphic source, and finally define `mix-blend-mode: multiply` in CSS.
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
        <feComposite in={props.in ?? 'SourceGraphic'} result={props.result} />
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
        <feMorphology in={props.in} operator='erode' radius={props.spread} />
        <feGaussianBlur stdDeviation={props.blur} />
        <feOffset dx={offsetX} dy={offsetY} result='blur' />
        <feFlood floodColor='black' />
        <feComposite in2='blur' operator='out' />
        <feComposite in2={props.in ?? 'SourceGraphic'} operator='in' result='shadow' />
        <feComposite in={props.in ?? 'SourceGraphic'} operator='in' />
        <feComposite in='shadow' operator='over' />
        <ColorCorrection opacity={props.opacity} saturation={props.saturation} />
        <feComposite in2={props.in ?? 'SourceGraphic'} result={props.result} />
    </>

ShadowInset.propTypes = {
    ...ColorCorrection.propTypes,
    blur: NumberOrString.isRequired,
    in: PropTypes.string,
    offsetX: NumberOrString,
    offsetY: NumberOrString,
    result: PropTypes.string,
    threshold: NumberOrString.isRequired,
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

const baseArea = { height: '100%', width: '100%', x: '0%', y: '0%' }
const largeArea = { height: '300%', width: '300%', x: '-100%', y: '-100%' }

/**
 * Filter :: Props -> React.Element
 *
 * Props => { name: String, [SVGFeAttribute]: SVGFeAttributeValue }
 *
 * It should not wrap the filter primitive inside a `<filter>` container if a
 * previous `in` or a following `result` filter primitive id is given as prop.
 */
const Filter = ({
    colorInterpolation = 'sRGB',
    height: h,
    name,
    id = name,
    x: offsetX,
    y: offsetY,
    width: w,
    ...props
}) => {

    const { height, x, y, width } = React.useMemo(
        () => {
            if ((w ?? h) && (offsetX ?? offsetY)) {
                return {
                    height: h,
                    width: w,
                    x: w ? `-${(w.slice(0, -1) - 100) / 2}%` : '0%',
                    y: h ? `-${(h.slice(0, -1) - 100) / 2}%` : '0%',
                }
            } else if (name.endsWith('-inset')) {
                return baseArea
            }
            return largeArea
        },
        [h, name, offsetX, offsetY, w])

    if (props.in ?? props.result) {
        return primitives[name](props)
    }

    return (
        <filter
            id={id}
            x={offsetX ?? x}
            y={offsetY ?? y}
            width={width}
            height={height}
            colorInterpolation={colorInterpolation}>
            {primitives[name](props)}
        </filter>
    )
}

Filter.propTypes = {
    colorInterpolation: PropTypes.oneOf(['linearRGB', 'sRGB']),
    height: Percentage,
    id: PropTypes.string,
    in: PropTypes.string,
    name: PropTypes.oneOf(Object.keys(primitives)),
    result: PropTypes.string,
    width: Percentage,
    x: Percentage,
    y: Percentage,
}

export default Filter
