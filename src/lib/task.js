
import now from './now.js'

let currentTaskId = 1
const cancelledTaskIds = []

export const microtask = {
    cancel: taskId => cancelledTaskIds.push(taskId),
    request: fn => {
        Promise.resolve(currentTaskId).then(taskId => { // eslint-disable-line compat/compat
            if (cancelledTaskIds.includes(taskId)) {
                return
            }
            fn(now())
        })
        return currentTaskId++
    },
}

/**
 * Memo: binding `cancel|requestAnimationFrame()` will throw illegal invocation
 * error.
 */
const animation = { cancel: id => cancelAnimationFrame(id), request: fn => requestAnimationFrame(fn) }

const task = process.env.NODE_ENV === 'test' // eslint-disable-line no-undef
    ? microtask
    : animation

export default task
