"use client";

import type { WeddingEvent } from "@/types/database";

interface EventSelectorProps {
  events: WeddingEvent[];
  selectedEvent: WeddingEvent | null;
  onSelect: (event: WeddingEvent) => void;
}

function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export default function EventSelector({
  events,
  selectedEvent,
  onSelect,
}: EventSelectorProps) {
  if (events.length === 0) return null;

  return (
    <div className="bg-white border-b border-neutral-200">
      <div className="max-w-lg mx-auto px-4 py-3">
        <p className="text-[10px] text-neutral-400 mb-2 font-medium uppercase tracking-widest">
          Event
        </p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {events.map((event) => {
            const isSelected = selectedEvent?.id === event.id;
            const today = isToday(event.date);
            return (
              <button
                key={event.id}
                onClick={() => onSelect(event)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 relative
                  ${
                    isSelected
                      ? "bg-black text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
              >
                {event.name}
                {today && (
                  <span
                    className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-green-300" : "bg-green-500"
                    }`}
                    aria-label="Today"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
