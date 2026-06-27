"use client";

import {
    useMemo,
    type CSSProperties,
} from "react";

import type {
    Card,
    Deck,
    LayoutBox,
} from "@/lib/deck-schema";
import {
    getCardImageReference,
    getImageSource,
    isBackImageSlot,
    isRemoteUrl,
} from "@/lib/deck-utils";
import {
    styleColor,
    styleFontFamily,
} from "@/lib/layout-style";

export function boxStyle(box: LayoutBox): CSSProperties {
    const [left, bottom] = box["bottom-left"];
    const [right, top] = box["top-right"];

    return {
        left: `${left * 100}%`,
        top: `${(1 - top) * 100}%`,
        width: `${(right - left) * 100}%`,
        height: `${(top - bottom) * 100}%`,
    };
}

function EditableImage({
    reference,
    files,
    label,
}: {
    reference: string | undefined;
    files: Map<string, File>;
    label: string;
}) {
    const imageSource = useMemo(
        () => getImageSource(reference, files),
        [reference, files],
    );

    if (imageSource) {
        return (
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
        );
    }

    return (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 p-3 text-center text-sm font-bold uppercase text-red-800">
            {label}
        </div>
    );
}

export function CardPreview({
    deck,
    card,
    files,
}: {
    deck: Deck;
    card: Card;
    files: Map<string, File>;
}) {
    const layout = deck.layout;

    if (!layout) {
        return (
            <div className="flex aspect-[5/7] w-full max-w-sm items-center justify-center rounded border border-slate-700 bg-white p-8 text-center text-slate-900">
                {card.name}
            </div>
        );
    }

    return (
        <div className="aspect-[5/7] w-full max-w-sm overflow-hidden rounded border-[6px] border-slate-950 bg-white shadow-2xl">
            <div className="relative h-full w-full">
                <div
                    className="absolute bg-red-700 text-white"
                    style={{
                        ...boxStyle(layout.title),
                        backgroundColor: styleColor(
                            layout.title.style,
                            "backgroundColor",
                            "#b91c1c",
                        ),
                        color: styleColor(
                            layout.title.style,
                            "textColor",
                            "#ffffff",
                        ),
                        fontFamily: styleFontFamily(
                            layout.title.style,
                        ),
                    }}
                >
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                        <div className="text-xl font-black leading-tight">
                            {card.name}
                        </div>

                        <div className="mt-1 text-xs font-bold uppercase tracking-wide">
                            {card.category ?? "Trading Card"}
                        </div>
                    </div>
                </div>

                {layout.images.image_list.map((imageLayout, index) => {
                    if (isBackImageSlot(imageLayout.name)) {
                        return null;
                    }

                    const reference = getCardImageReference(
                        card,
                        imageLayout.name,
                    );

                    return (
                        <div
                            key={imageLayout.name}
                            className="absolute overflow-hidden border-2 border-slate-950"
                            style={{
                                ...boxStyle(imageLayout),
                                borderColor: styleColor(
                                    imageLayout.style,
                                    "borderColor",
                                    "#111827",
                                ),
                                zIndex: index + 1,
                            }}
                        >
                            <EditableImage
                                reference={reference}
                                files={files}
                                label={card.name}
                            />
                        </div>
                    );
                })}

                <div
                    className="absolute bg-white"
                    style={{
                        ...boxStyle(layout.information),
                        backgroundColor: styleColor(
                            layout.information.style,
                            "backgroundColor",
                            "#ffffff",
                        ),
                    }}
                />

                <div
                    className="absolute px-4 py-3 text-sm font-semibold leading-tight text-slate-700"
                    style={{
                        ...boxStyle(layout.information.description),
                        backgroundColor:
                            layout.information.description.style
                                ?.backgroundColor,
                        color: styleColor(
                            layout.information.description.style,
                            "textColor",
                            "#334155",
                        ),
                        fontFamily: styleFontFamily(
                            layout.information.description.style,
                        ),
                    }}
                >
                    {card.description}
                </div>

                {layout.information.stats.map((statLayout, index) => {
                    const stat = card.stats.find(
                        (candidate) =>
                            candidate.label === statLayout.label,
                    );

                    return (
                        <div
                            key={statLayout.label}
                            className={`absolute flex items-center justify-between px-4 text-sm font-bold ${
                                index % 2 === 0
                                    ? "bg-slate-200"
                                    : "bg-slate-100"
                            }`}
                            style={{
                                ...boxStyle(statLayout),
                                backgroundColor: styleColor(
                                    statLayout.style,
                                    "backgroundColor",
                                    index % 2 === 0
                                        ? "#e2e8f0"
                                        : "#f8fafc",
                                ),
                                fontFamily: styleFontFamily(
                                    statLayout.style,
                                ),
                            }}
                        >
                            <span
                                className="text-slate-800"
                                style={{
                                    color: styleColor(
                                        statLayout.style,
                                        "textColor",
                                        "#1e293b",
                                    ),
                                }}
                            >
                                {statLayout.label}
                            </span>
                            <span
                                className="text-red-800"
                                style={{
                                    color: styleColor(
                                        statLayout.style,
                                        "accentColor",
                                        "#991b1b",
                                    ),
                                }}
                            >
                                {stat?.value ?? "-"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
