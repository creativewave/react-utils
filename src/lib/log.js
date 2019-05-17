
const log = (group, debug, ...messages) => {
    if (!debug) return
    const now = new Date()
    const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`
    console.group(`${group} - ${time}`)
    messages.forEach(message => console.log(message))
    console.groupEnd()
}

export default log
