import Icon from './Icon';
import React from 'react';
import clsx from 'clsx';
import {CSS} from '@dnd-kit/utilities';
import {useSortable} from '@dnd-kit/sortable';

interface SortableListItemProps {
    id: string;
    separator?: boolean;
    containerClasses?: string;
    children?: React.ReactNode;
    dragHandlerAlwaysOn?: boolean;
    dragging?: boolean;
}

const SortableListItem: React.FC<SortableListItemProps> = ({
    id,
    separator = true,
    containerClasses,
    children,
    dragging,
    dragHandlerAlwaysOn = false
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition
    } = useSortable({id: id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    containerClasses = clsx(
        'flex items-center gap-4 py-1',
        (separator && !dragging) && '-mt-px border-y border-grey-200',
        dragging && 'z-[9999] shadow',
        containerClasses,
        !dragHandlerAlwaysOn && 'group'
    );

    const handlerClasses = clsx(
        dragging ? 'cursor-grabbing' : 'cursor-grab',
        !dragHandlerAlwaysOn && 'opacity-30 group-hover:opacity-100'
    );

    return (
        <div ref={setNodeRef} className={containerClasses} style={style}>
            <button className={handlerClasses} type='button' {...attributes} {...listeners}>
                <Icon colorClass='text-grey-500' name='hamburger' size='sm' />
            </button>
            <div>{children}</div>
        </div>
    );
};

export default SortableListItem;