import type {Meta, StoryObj} from '@storybook/react';

import SortableList from './SortableList';
import SortableListItem from './SortableListItem';

const meta = {
    title: 'Global / List / Sortable',
    component: SortableList,
    tags: ['autodocs']
} satisfies Meta<typeof SortableList>;

export default meta;
type Story = StoryObj<typeof SortableList>;

const list = [
    {id: '1', title: 'Item one'},
    {id: '2', title: 'Item two'},
    {id: '3', title: 'Item three'}
];

const handleDragEnd = (activeId: string, overId?: string) => {
    alert('dragged: ' + activeId + ' over: ' + overId);
};

export const Default: Story = {
    args: {
        items: list,
        handleDragEnd: handleDragEnd,
        handleDragStart: () => {},
        title: 'Sortable list',
        listItems: <>
            {
                list.map(item => (
                    <SortableListItem id={item.id}>
                        <div className='py-3'>
                            {item.title}
                        </div>
                    </SortableListItem>
                ))
            }
        </>
    }
};
