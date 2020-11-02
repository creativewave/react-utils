
import { useCallback, useState } from 'react'

/**
 * useValidation :: Props -> [String, Props]
 *
 * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation
 * https://developer.mozilla.org/en-US/docs/Web/API/ValidityState
 *
 * Memo: default behavior validates on blur vs. on change, which might not be
 * the best user experience in some cases, like filling a password field with an
 * output value that is obfuscated and has multiple conditions.
 *
 * TODO: implement interface(s) to use and register a custom validation function
 * using the Constraint Validation API (default behavior: exit on first error).
 */
const useValidation = ({ onChange, onBlur, validateOnChange = false }) => {

    const [error, setError] = useState()

    const handleBlur = useCallback(event => {

        const hasError =
            event.target.willValidate
            && event.target.value !== ''
            && !event.target.validity.valid

        if (hasError) {
            setError(event.target.validationMessage)
        }
        onBlur && onBlur(event)

        return hasError

    }, [onBlur])

    const handleChange = useCallback(event => {

        if (!validateOnChange || !handleBlur(event)) {
            setError('')
        }
        onChange?.(event)

    }, [handleBlur, onChange, setError, validateOnChange])

    return [error, { onBlur: validateOnChange ? onBlur : handleBlur, onChange: handleChange }]
}

export default useValidation
