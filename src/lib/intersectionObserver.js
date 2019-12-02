
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
        this.scrollPosition = 0

        if (this.root === null) {
            this.root = document
        }
        this.root.addEventListener('wheel', this._listen.bind(this))
    }

    _listen(event) {

        const scrollPosition = this.scrollPosition + event.deltaY
        if (scrollPosition < 0 || this.entries.length < scrollPosition) {
            return
        }
        this.scrollPosition = scrollPosition

        let hasIntersection = false
        let entryIndex = 0
        for (; entryIndex < this.entries.length; entryIndex++) {
            if (hasIntersection) {
                break
            }
            const entries = this._getIntersectingEntries(this.entries[entryIndex], entryIndex)
            if (entries.length > 0) {
                hasIntersection = true
                this.callback(entries, this)
            }
        }
    }

    _getIntersectingEntries(entry, index, single = false) {

        const entryTop = (1 * index) - this.scrollPosition
        const entryBottom = (1 * index) + 1 - this.scrollPosition
        const top = Math.max(entryTop, 0)
        const bottom = Math.min(entryBottom, 1)

        const isIntersecting = (bottom - top) > 0

        if (single) {
            if (isIntersecting) {
                this.inView = entry
            }
            return [{ isIntersecting, target: entry }]
        }
        if (isIntersecting) {
            const prevInView = this.inView
            this.inView = entry
            return [{ isIntersecting: false, target: prevInView }, { isIntersecting: true, target: entry }]
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
        this.root.removeEventListener('wheel', this.onWheel)
    }
}

export default (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined')
    ? Mock
    : window.IntersectionObserver
