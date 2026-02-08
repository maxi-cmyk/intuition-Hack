import { QueueItem } from "../types";

export const HistorySection = ({
  items,
  onDelete,
  onEdit,
}: {
  items: QueueItem[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) => (
  <div className="mt-8">
    <h2 className="section-title mb-4">History</h2>
    {items.length === 0 ? (
      <p className="text-gray-500 text-center">No history yet.</p>
    ) : (
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.id} className="relative group aspect-square">
            {item.url ? (
              <img
                src={item.url}
                alt="Thumbnail"
                className="w-full h-full object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onEdit(item.id)}
              />
            ) : (
              <div
                className="w-full h-full bg-white/5 rounded-md flex items-center justify-center cursor-pointer hover:bg-white/10"
                onClick={() => onEdit(item.id)}
              >
                <span className="text-2xl">🎵</span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);
