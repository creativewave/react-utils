
import noop from './noop'

export const universalDocument = 'object' === typeof document
    ? document
    : { addEventListener: noop }
