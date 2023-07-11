// import Heading from './Heading';
import ListHeading from './ListHeading';
import React from 'react';
import {DndContext, closestCenter} from '@dnd-kit/core';
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';

export interface SortableListProps {
    title?: string;
    items: any[];
    listItems: React.ReactNode;
    handleDragEnd: (activeId: string, overId?: string) => void;
    handleDragStart: (draggingId: string) => void;
}

const SortableList: React.FC<SortableListProps> = ({
    title,
    items,
    listItems,
    handleDragEnd,
    handleDragStart
}) => {
    return (
        <section>
            <ListHeading title={title} titleSeparator />
            <div>
                <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={event => handleDragEnd(event.active.id as string, event.over?.id as string)}
                    onDragStart={event => handleDragStart(event.active.id as string)}
                >
                    <SortableContext
                        items={items}
                        strategy={verticalListSortingStrategy}
                    >
                        {listItems}
                    </SortableContext>
                </DndContext>
            </div>
        </section>
    );
};

export default SortableList;