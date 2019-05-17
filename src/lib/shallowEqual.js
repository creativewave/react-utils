
const shallowEqual = (prev, current) => {
    for (const prop in prev)
        if (prev[prop] !== current[prop])
            return false
    return true
}

export default shallowEqual
