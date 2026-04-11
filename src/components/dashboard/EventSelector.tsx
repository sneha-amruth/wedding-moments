"use client";

import type { WeddingEvent } from "@/types/database";

interface EventSelectorProps {
  events: WeddingEvent[];
  selectedEvent: WeddingEvent | null;
  onSelect: (event: WeddingEvent) => void;
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
            return (
              <button
                key={event.id}
                onClick={() => onSelect(event)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  ${
                    isSelected
                      ? "bg-black text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
              >
                {event.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
