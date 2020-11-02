
import task from '../../src/lib/task'

describe('raf', () => {
    it('should stub window.requestAnimationFrame() and window.cancelAnimationFrame()', () => {

        const ids = []
        const timestamps = []
        const addTimestamp = t => timestamps.push(t)

        ids.push(task.request(addTimestamp))
        ids.push(task.request(addTimestamp))
        ids.push(task.request(addTimestamp))
        expect(ids).toHaveLength(3)
        task.cancel(ids[2])

        return Promise.resolve().then(() => expect(timestamps).toHaveLength(2))
    })
})
