import Heading from '../Heading';
import React from 'react';
import Separator from '../Separator';
import clsx from 'clsx';

interface FormProps {
    title?: string;
    group?: boolean;
    gap?: 'sm' | 'md' | 'lg';
    marginTop?: boolean;
    marginBottom?: boolean;
    children?: React.ReactNode;
}

/**
 * A container to group form elements
 */
const Form: React.FC<FormProps> = ({
    title,
    group,
    gap = 'md',
    marginTop = false,
    marginBottom = true,
    children
}) => {
    let classes = clsx(
        'flex flex-col',
        (gap === 'sm' && 'gap-4'),
        (gap === 'md' && 'gap-8'),
        (gap === 'lg' && 'gap-11')
    );

    if (marginBottom) {
        classes = clsx(
            classes,
            (gap === 'sm' && 'mb-4'),
            (gap === 'md' && 'mb-8'),
            (gap === 'lg' && 'mb-11')
        );
    }

    if (marginTop) {
        classes = clsx(
            classes,
            (gap === 'sm' && 'mt-4'),
            (gap === 'md' && 'mt-8'),
            (gap === 'lg' && 'mt-11')
        );
    }

    return (
        <div className={group ? '' : classes}>
            {title &&
            (<div>
                <Heading level={6} grey>{title}</Heading>
                {!group && <Separator />}
            </div>)}
            {group ? <div className={group && `${classes} border border-grey-200 p-7`}>{children}</div> : children}
        </div>
    );
};

export default Form;