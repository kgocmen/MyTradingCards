"use client";

import type {
    ChangeEvent,
} from "react";

import type {
    Card,
    Deck,
} from "@/lib/deck-schema";
import {
    getCardImageReference,
    setCardImageReference,
} from "@/lib/deck-utils";

export function CardEditPanel({
    deck,
    card,
    message,
    onChangeCard,
    onChangeStat,
    onChangeImageFile,
}: {
    deck: Deck;
    card: Card;
    message: string;
    onChangeCard: (card: Card) => void;
    onChangeStat: (statLabel: string, value: string) => void;
    onChangeImageFile: (
        slotName: string,
        event: ChangeEvent<HTMLInputElement>,
    ) => void;
}) {
    return (
        <section className="space-y-4 rounded-xl bg-slate-900 p-5">
            <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Name
                </label>

                <input
                    value={card.name}
                    onChange={(event) =>
                        onChangeCard({
                            ...card,
                            name: event.target.value,
                        })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
            </div>

            <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Category
                </label>

                <input
                    value={card.category ?? ""}
                    onChange={(event) =>
                        onChangeCard({
                            ...card,
                            category: event.target.value,
                        })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
            </div>

            <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Description
                </label>

                <textarea
                    value={card.description ?? ""}
                    onChange={(event) =>
                        onChangeCard({
                            ...card,
                            description: event.target.value,
                        })
                    }
                    className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
            </div>

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-300">
                    Images
                </h2>

                {deck.layout?.images.image_list.map((imageLayout) => {
                    const reference =
                        getCardImageReference(
                            card,
                            imageLayout.name,
                        ) ?? "";

                    return (
                        <div
                            key={imageLayout.name}
                            className="space-y-2"
                        >
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {imageLayout.name}
                            </label>

                            <input
                                value={reference}
                                onChange={(event) =>
                                    onChangeCard(
                                        setCardImageReference(
                                            card,
                                            imageLayout.name,
                                            event.target.value,
                                        ),
                                    )
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                            />

                            <input
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={(event) =>
                                    onChangeImageFile(
                                        imageLayout.name,
                                        event,
                                    )
                                }
                                className="block w-full text-xs text-slate-300"
                            />
                        </div>
                    );
                })}
            </div>

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-300">
                    Stats
                </h2>

                {card.stats.map((stat) => (
                    <label
                        key={stat.label}
                        className="grid grid-cols-[1fr_90px] items-center gap-3 text-sm text-slate-300"
                    >
                        <span>{stat.label}</span>

                        <input
                            value={stat.value}
                            onChange={(event) =>
                                onChangeStat(
                                    stat.label,
                                    event.target.value,
                                )
                            }
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                        />
                    </label>
                ))}
            </div>

            {message ? (
                <p className="rounded-lg bg-slate-950 p-3 text-sm text-slate-300">
                    {message}
                </p>
            ) : null}
        </section>
    );
}
