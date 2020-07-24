
import { universalDocument as document } from './universal'

/**
 * This mock of `IntersectionObserver` assumes that:
 * 1. `root` is always in the viewport
 * 2. `root.scrollHeight` is equal to the number of `Element`s
 * 3. `Element.scrollHeight` is equal to `1`
 * 4. `Element`s are laid out vertically
 * 5. `threshold` and `rootMargin` are ignored
 * 6. `callback` is executed with `isIntersecting` and `[{ target: Element }]`
 *    (instead of `[IntersectionObserverEntry]`) after a vertical wheel
 */
const Mock = class IntersectionObserver { // eslint-disable-line no-undef

    constructor(callback, { root = null } = {}) {

        this.callback = callback
        this.entries = []
        this.root = root
        this.scrollTop = 0

        if (this.root === null) {
            this.root = document
        }
        this.listener = this._listen.bind(this)
        this.root.addEventListener('wheel', this.listener)
    }

    _listen(event) {

        this.scrollTop += event.deltaY
        if (this.scrollTop < 0 || this.entries.length < this.scrollTop - 1) {
            return
        } else if (this.entries.length === this.scrollTop) {
            setTimeout(
                () => this.callback([{
                    isIntersecting: false,
                    target: this.entries[this.entries.length - 1],
                }], this),
                0)
            return
        }

        let hasIntersection = false
        let entryIndex = 0
        for (; entryIndex < this.entries.length; entryIndex++) {
            if (hasIntersection) {
                break
            }
            const entries = this._getIntersectingEntries(this.entries[entryIndex], entryIndex)
            if (entries.length > 0) {
                hasIntersection = true
                /**
                 * Memo: wrapped with setTimeout to make sure a "beforeScroll"
                 * callback is run before an "onEnter" callback (after scroll)
                 */
                setTimeout(() => this.callback(entries, this), 0)
            }
        }
    }

    _getIntersectingEntries(entry, index, single = false) {

        const entryTop = (1 * index) - this.scrollTop
        const entryBottom = (1 * index) + 1 - this.scrollTop
        const top = Math.max(entryTop, 0)
        const bottom = Math.min(entryBottom, 1)

        const isIntersecting = (bottom - top) > 0

        if (single) {
            if (isIntersecting) {
                this.inView = entry
            }
            return [{ intersectionRatio: isIntersecting ? 1 : 0, isIntersecting, target: entry }]
        }
        if (isIntersecting) {
            const prevInView = this.inView
            this.inView = entry
            return [
                { isIntersecting: false, target: prevInView },
                { intersectionRatio: 1, isIntersecting: true, target: entry },
            ]
        }

        return []
    }

    observe(entry) {
        this.entries.push(entry)
        this.callback(this._getIntersectingEntries(entry, this.entries.length - 1, true), this)
    }

    unobserve(entry) {
        this.entries = this.entries.filter(e => e !== entry)
    }

    disconnect() {
        this.entries = []
        this.root.removeEventListener('wheel', this.listener)
    }
}

export default window?.IntersectionObserver ?? Mock
