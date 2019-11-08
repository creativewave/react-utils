
/**
 * round :: Number -> Number -> Number
 *
 * It should round numbers to the given precision if required, eg.:
 *
 *   round(0, 1)    -> 1
 *   round(1, 1)    -> 1
 *   round(1, 1.15) -> 1.2
 *
 * Memo: unary `+` operator coerces the `String` returned by `toFixed`.
 */
const round = (precision = 0, n) => +n.toFixed(precision)

export default round
