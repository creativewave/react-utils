
import noop from './noop.js'

export const universalDocument = 'object' === typeof document
    ? document
    : { addEventListener: noop }
