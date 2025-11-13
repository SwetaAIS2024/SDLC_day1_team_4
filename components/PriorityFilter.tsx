import { Priority, PRIORITY_CONFIG } from '@/lib/types';

interface PriorityFilterProps {
  selectedPriority: Priority | 'all';
  onFilterChange: (priority: Priority | 'all') => void;
  counts: Record<Priority, number>;
}

export function PriorityFilter({ selectedPriority, onFilterChange, counts }: PriorityFilterProps) {
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => onFilterChange('all')}
        className={`
          px-4 py-2 rounded-lg font-medium transition
          ${selectedPriority === 'all' 
            ? 'bg-gray-800 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
      >
        All ({totalCount})
      </button>
      
      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
        const priority = key as Priority;
        const count = counts[priority];
        
        return (
          <button
            key={key}
            onClick={() => onFilterChange(priority)}
            className={`
              px-4 py-2 rounded-lg font-medium transition
              border-2
              ${selectedPriority === priority
                ? `${config.color}`
                : `bg-white border-gray-200 hover:${config.color}`
              }
            `}
          >
            {config.label} ({count})
          </button>
        );
      })}
    </div>
  );
}
