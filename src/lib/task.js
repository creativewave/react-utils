/* eslint-disable no-undef, compat/compat */

import now from './now'

let currentTaskId = 1
const cancelledTaskIds = []

export const microtask = {
    cancel: taskId => cancelledTaskIds.push(taskId),
    request: fn => {
        Promise.resolve(currentTaskId).then(taskId => {
            if (cancelledTaskIds.includes(taskId)) {
                return
            }
            fn(now())
        })
        return currentTaskId++
    },
}

const task = process.env.NODE_ENV === 'test' // eslint-disable-line no-undef
    ? microtask
    : { cancel: id => cancelAnimationFrame(id), request: fn => requestAnimationFrame(fn) }

export default task
