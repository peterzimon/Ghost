import Hint from '../Hint';
import React, {ChangeEventHandler, FocusEventHandler, useId, useState} from 'react';
import clsx from 'clsx';
import {Heading6Styles} from '../Heading';
import {useFocusContext} from '../../providers/DesignSystemProvider';

export type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
    inputRef?: React.RefObject<HTMLInputElement>;
    title?: string;
    titleColor?: 'auto' | 'black' | 'grey';
    hideTitle?: boolean;
    type?: React.InputHTMLAttributes<HTMLInputElement>['type'];
    value?: string;
    error?: boolean;
    placeholder?: string;
    rightPlaceholder?: React.ReactNode;
    hint?: React.ReactNode;
    clearBg?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    className?: string;
    maxLength?: number;
    containerClassName?: string;
    hintClassName?: string;
    unstyled?: boolean;
    disabled?: boolean;
    border?: boolean;
    autoFocus?: boolean;
}

const TextField: React.FC<TextFieldProps> = ({
    type = 'text',
    inputRef,
    title,
    hideTitle,
    value,
    error,
    placeholder,
    rightPlaceholder,
    hint,
    clearBg = true,
    onChange,
    onFocus,
    onBlur,
    className = '',
    maxLength,
    containerClassName = '',
    hintClassName = '',
    unstyled = false,
    disabled,
    border = true,
    ...props
}) => {
    const id = useId();
    const {setFocusState} = useFocusContext();
    const [isFocused, setIsFocused] = useState(false);
    const [fieldValue, setFieldValue] = useState(value);

    const handleFocus: FocusEventHandler<HTMLInputElement> = (e) => {
        onFocus?.(e);
        setFocusState(true);
        setIsFocused(true);
    };

    const handleBlur: FocusEventHandler<HTMLInputElement> = (e) => {
        onBlur?.(e);
        setFocusState(false);
        setIsFocused(false);
    };

    const handleOnChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        onChange?.(e);
        setFieldValue(e.currentTarget.value);
    };

    const disabledBorderClasses = border && 'border-grey-300 dark:border-grey-900';
    const enabledBorderClasses = border && 'border-grey-500 hover:border-grey-700 focus:border-black dark:border-grey-800 dark:hover:border-grey-700 dark:focus:border-grey-500';

    const textFieldClasses = !unstyled && clsx(
        'peer order-2 h-8 w-full py-1 text-sm transition-all placeholder:transition-all dark:text-white dark:placeholder:text-grey-800 md:h-10 md:py-2 md:text-base',
        isFocused || !title || hideTitle ? 'placeholder:text-grey-400' : 'placeholder:text-transparent',
        border && 'border-b',
        !border && '-mb-1.5',
        clearBg ? 'bg-transparent' : 'bg-grey-75 px-[10px]',
        error && border ? `border-red` : `${disabled ? disabledBorderClasses : enabledBorderClasses}`,
        (title && !hideTitle && !clearBg) && `mt-2`,
        (disabled ? 'cursor-not-allowed text-grey-700 opacity-60 dark:text-grey-800' : ''),
        rightPlaceholder && 'w-0 grow',
        className
    );

    let field = <></>;

    const inputField = <input
        ref={inputRef}
        className={textFieldClasses || className}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        placeholder={placeholder}
        type={type}
        value={value}
        onBlur={handleBlur}
        onChange={handleOnChange}
        onFocus={handleFocus}
        {...props} />;

    if (rightPlaceholder) {
        const rightPHEnabledBorderClasses = 'transtion-all border-grey-500 dark:border-grey-800 peer-hover:border-grey-700 peer-focus:border-black dark:peer-focus:border-grey-500';
        const rightPHClasses = !unstyled && clsx(
            'order-3 transition-all',
            border && 'border-b',
            !border && '-mb-1.5',
            (typeof (rightPlaceholder) === 'string') ? 'h-8 py-1 text-right text-sm text-grey-500 md:h-10 md:py-2 md:text-base' : 'h-10',
            error && border ? `border-red` : `${disabled ? disabledBorderClasses : rightPHEnabledBorderClasses}`
        );

        field = (
            <div className='order-2 flex w-full items-center'>
                {inputField}
                <span className={rightPHClasses || ''}>{rightPlaceholder}</span>
            </div>
        );
    } else {
        field = inputField;
    }

    hintClassName = clsx(
        'order-3',
        hintClassName
    );

    containerClassName = clsx(
        'relative flex flex-col',
        containerClassName
    );

    const labelClasses = clsx(
        'pointer-events-none absolute text-grey-600 transition-all',
        isFocused || fieldValue ? `-top-3 ${isFocused && 'text-grey-900'} ${Heading6Styles}` : 'top-2'
    );
    const labelText = <label className={labelClasses}>{title}</label>;

    if (title || hint) {
        return (
            <div className={containerClassName}>
                {field}
                {labelText && !hideTitle && labelText}
                {hint && <Hint className={hintClassName} color={error ? 'red' : 'default'}>{hint}</Hint>}
            </div>
        );
    } else {
        return (field);
    }
};

export default TextField;
