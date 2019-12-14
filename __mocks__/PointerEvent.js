
/**
 * PointerEvent
 *
 * It should mock the native `PointerEvent` for jsdom.
 *
 * TODO: remove it when jsdom supports it.
 * Related: https://github.com/jsdom/jsdom/pull/2666
 */
export default class PointerEvent extends Event {

    constructor(type, { button, pointerType, screenX, screenY, ...init }) {

        super(type, init)

        this.button = button
        this.screenX = screenX
        this.screenY = screenY
        this.pointerType = pointerType
    }
}
