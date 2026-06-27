"use client";

import type { Card } from "@/lib/deck-schema";

export function CardList({
    cards,
    selectedIndex,
    onSelect,
    onAdd,
    onRemove,
}: {
    cards: Card[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    onAdd: () => void;
    onRemove: () => void;
}) {
    return (
        <aside className="flex min-h-0 flex-col rounded-xl bg-slate-900 p-3">
            <div className="mb-3 grid shrink-0 grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={onAdd}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold transition hover:bg-violet-500"
                >
                    Add
                </button>

                <button
                    type="button"
                    onClick={onRemove}
                    disabled={cards.length <= 1}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Remove
                </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {cards.map((card, index) => (
                    <button
                        key={card.id ?? card.name}
                        type="button"
                        onClick={() => onSelect(index)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                            index === selectedIndex
                                ? "bg-violet-600 text-white"
                                : "text-slate-300 hover:bg-slate-800"
                        }`}
                    >
                        {card.name}
                    </button>
                ))}
            </div>
        </aside>
    );
}
