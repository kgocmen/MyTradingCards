"use client";

import { useMemo } from "react";

import { boxStyle } from "@/components/card-preview";
import type { Deck } from "@/lib/deck-schema";
import {
    getCardImageReference,
    getImageSource,
    isBackImageSlot,
    isRemoteUrl,
} from "@/lib/deck-utils";

type DeckLayout = NonNullable<Deck["layout"]>;

function BackPreview({
    layout,
    deck,
    files,
}: {
    layout: DeckLayout;
    deck: Deck;
    files: Map<string, File>;
}) {
    const backLayout = layout.images.image_list.find((imageLayout) =>
        isBackImageSlot(imageLayout.name),
    );
    const reference =
        deck.cards[0] && backLayout
            ? getCardImageReference(deck.cards[0], backLayout.name)
            : undefined;
    const imageSource = useMemo(
        () => getImageSource(reference, files),
        [reference, files],
    );

    return (
        <div className="aspect-[5/7] w-full max-w-sm overflow-hidden rounded border-4 border-slate-950 bg-white shadow-2xl">
            {imageSource ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={imageSource}
                    alt=""
                    className="h-full w-full object-cover"
                    onLoad={() => {
                        if (!isRemoteUrl(imageSource)) {
                            URL.revokeObjectURL(imageSource);
                        }
                    }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 p-6 text-center text-xl font-black uppercase text-red-800">
                    {backLayout?.name ?? "Back"}
                </div>
            )}
        </div>
    );
}

export function LayoutPreview({
    layout,
    deck,
    files,
}: {
    layout: DeckLayout;
    deck: Deck;
    files: Map<string, File>;
}) {
    return (
        <div className="flex w-full flex-wrap items-start justify-center gap-6">
            <div className="aspect-[5/7] w-full max-w-sm overflow-hidden rounded border-4 border-slate-950 bg-white shadow-2xl">
                <div className="relative h-full w-full">
                    <div
                        className="absolute flex items-center justify-center bg-red-700 px-3 text-center text-xl font-black text-white"
                        style={boxStyle(layout.title)}
                    >
                        Title
                    </div>

                    {layout.images.image_list.map((imageLayout, index) => {
                        if (isBackImageSlot(imageLayout.name)) {
                            return null;
                        }

                        return (
                            <div
                                key={`${imageLayout.name}-${index}`}
                                className="absolute flex items-center justify-center overflow-hidden border-2 border-slate-950 bg-slate-100 px-2 text-center text-sm font-black uppercase text-red-800"
                                style={{
                                    ...boxStyle(imageLayout),
                                    zIndex: index + 1,
                                }}
                            >
                                {imageLayout.name}
                            </div>
                        );
                    })}

                    <div
                        className="absolute bg-white"
                        style={boxStyle(layout.information)}
                    />

                    <div
                        className="absolute flex items-center px-4 text-sm font-semibold text-slate-700"
                        style={boxStyle(layout.information.description)}
                    >
                        Description
                    </div>

                    {layout.information.stats.map((statLayout, index) => (
                        <div
                            key={`${statLayout.label}-${index}`}
                            className={`absolute flex items-center justify-between px-4 text-sm font-bold ${
                                index % 2 === 0
                                    ? "bg-slate-200"
                                    : "bg-slate-100"
                            }`}
                            style={boxStyle(statLayout)}
                        >
                            <span className="text-slate-800">
                                {statLayout.label}
                            </span>
                            <span className="text-red-800">0</span>
                        </div>
                    ))}
                </div>
            </div>

            <BackPreview
                layout={layout}
                deck={deck}
                files={files}
            />
        </div>
    );
}
