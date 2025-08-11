import { forwardRef } from 'react';

const InputError = forwardRef(({ message, className = '', ...props }, ref) => {
    return message ? (
        <p {...props} className={'text-sm text-red-600 ' + className} ref={ref}>
            {message}
        </p>
    ) : null;
});

InputError.displayName = 'InputError';

export default InputError; 