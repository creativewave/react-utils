
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
const ColorCorrection = ({ lightness = 1, opacity = 0.5, saturation = 1, result = 'color-correction' }) => {

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
        <feColorMatrix
            values={`
                ${RR} ${RG} ${RB} ${LIGHTNESS} 0
                ${GR} ${GG} ${GB} ${LIGHTNESS} 0
                ${BR} ${BG} ${BB} ${LIGHTNESS} 0
                0 0 0 ${opacity} 0`}
            result={result} />
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
 * Memo: a glow should spread over the whole graphic source and it should be the
 * same color as the graphic source but with a higher luminosity and a lower
 * saturation, ie. blended with the screen mode.
 *
 * Memo: multiple glows can be stacked to get a more realistic result, using
 * different opacity/lightness and different `radius` ratios.
 */
const Glow = props =>
    <>
        <Scale {...props} />
        <feGaussianBlur stdDeviation={props.blur} />
        <ColorCorrection lightness={props.lightness} opacity={props.opacity} />
        <feBlend in={props.in ?? 'SourceGraphic'} mode='screen' result={props.result ?? 'glow'} />
    </>

Glow.propTypes = {
    ...ColorCorrection.propTypes,
    blur: NumberOrString.isRequired,
    in: PropTypes.string,
    result: PropTypes.string,
    spread: NumberOrString,
    threshold: NumberOrString,
}

/**
 * GlowInset :: Props -> React.Element
 *
 * Memo: an inset glow should spread from the center towards the edges of the
 * graphic source, and it should be the same color but with a higher luminosity
 * and a lower saturation, ie. blended with the screen mode.
 */
const GlowInset = props => <Glow operator='erode' result='glow-inset' {...props} />

GlowInset.propTypes = {
    ...ColorCorrection.propTypes,
    blur: NumberOrString.isRequired,
    in: PropTypes.string,
    result: PropTypes.string,
    spread: NumberOrString,
    threshold: NumberOrString,
}

/**
 * Gooey :: Props -> React.Element
 *
 * Memo: `stdDeviation` is used as a factor both for the global alpha value, to
 * "dilate" the (blurred) outline, and for its constant modifier, to "erode" and
 * re-sharpen the outline.
 */
const Gooey = props =>
    <>
        <feGaussianBlur in={props.in} stdDeviation={props.tolerance} />
        <feColorMatrix mode='matrix' values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${props.tolerance * 4} -${props.tolerance * 2}`} />
        <feComposite in='SourceGraphic' operator='atop' result={props.result ?? 'gooey'} />
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
        <feTurbulence baseFrequency={props.frequency} result='_noise' />
        <feFlood floodColor={color} />
        <ColorCorrection lightness={props.lightness} opacity={props.opacity} />
        <feComposite in2='_noise' operator='in' />
        <feComposite in2={props.in ?? 'SourceGraphic'} operator='in' />
        <feBlend in={props.in ?? 'SourceGraphic'} mode={blend} result={props.result ?? 'noise'} />
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
 * Scale :: Props -> React.Element
 */
const Scale = props => {
    if (props.spread > 0) {
        return <feMorphology in={props.in} operator='dilate' radius={props.spread} />
    } else if (props.threshold > 0) {
        return <feMorphology in={props.in} radius={props.threshold} />
    }
    return null
}

Scale.propTypes = {
    in: PropTypes.string,
    spread: NumberOrString,
    threshold: NumberOrString,
}

/**
 * shadow :: Props -> React.Element
 *
 * Memo: a shadow should spread outside the graphic source and ideally it should
 * be the same color(s) as the object(s) it covers but with a lower luminosity
 * and a higher saturation, ie. blended with the multiply mode, but SVG filters
 * can only be blended with a single graphic source object.
 *
 * Memo: don't use this filter alone, as it's non-sense to use JavaScript to
 * apply a filter already available and optimized as a CSS function.
 */
const Shadow = ({ color = 'black', offsetX = 0, offsetY = 0, ...props }) =>
    <>
        <Scale {...props} />
        <feGaussianBlur stdDeviation={props.blur} result='_blur' />
        <feFlood floodColor={color} />
        <feComposite in2='_blur' operator='in' />
        <ColorCorrection opacity={props.opacity} />
        <feOffset dx={offsetX} dy={offsetY} />
        <feComposite in={props.in ?? 'SourceGraphic'} result={props.result ?? 'shadow'} />
    </>

Shadow.propTypes = {
    blur: NumberOrString.isRequired,
    color: PropTypes.string,
    in: PropTypes.string,
    offsetX: NumberOrString,
    offsetY: NumberOrString,
    opacity: NumberOrString,
    result: PropTypes.string,
    spread: NumberOrString,
    threshold: NumberOrString,
}

/**
 * ShadowInset :: Props -> React.Element
 *
 * Memo: an inset shadow should spread from the outline towards the center of
 * the graphic source, and ideally it should be the same color but with a lower
 * luminosity and a higher saturation, ie. blended with the multiply mode, but
 * blending white with itself with the multiply mode will not produce anything.
 *
 * Memo: an important `saturation` value (eg. 5) should be given to achieve the
 * result described above, otherwise it will just be a shade of the source
 * graphic color.
 *
 * Memo: don't use this filter alone, as it's non-sense to use JavaScript to
 * apply a filter already available and optimized as a CSS function.
 */
const ShadowInset = ({ color = 'black', offsetX = 0, offsetY = 0, ...props }) =>
    <>
        <Scale in={props.in} spread={props.threshold} threshold={props.spread} />
        <feGaussianBlur stdDeviation={props.blur} />
        <feOffset dx={offsetX} dy={offsetY} result='_blur' />
        <feFlood floodColor={color} />
        <feComposite in2='_blur' operator='out' />
        <feComposite in2={props.in ?? 'SourceGraphic'} operator='in' result='_shadow' />
        <feComposite in={props.in ?? 'SourceGraphic'} operator='in' />
        <feComposite in='_shadow' operator='over' />
        <ColorCorrection opacity={props.opacity} saturation={props.saturation} />
        <feComposite in2={props.in ?? 'SourceGraphic'} result={props.result ?? 'shadow-inset'} />
    </>

ShadowInset.propTypes = {
    ...ColorCorrection.propTypes,
    blur: NumberOrString.isRequired,
    color: PropTypes.string,
    in: PropTypes.string,
    offsetX: NumberOrString,
    offsetY: NumberOrString,
    result: PropTypes.string,
    spread: NumberOrString,
    threshold: NumberOrString,
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
            colorInterpolation={colorInterpolation.toLowerCase() === 'srgb' ? 'sRGB' : null}>
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
