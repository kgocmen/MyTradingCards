"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useMemo,
    useState,
    useSyncExternalStore,
    type CSSProperties,
} from "react";

import type {
    Deck,
    LayoutBox,
} from "@/lib/deck-schema";
import {
    readPdfPreviewDraft,
    subscribeToPdfPreviewStore,
    updatePdfPreviewDeck,
    type PdfPreviewDraft,
} from "@/lib/pdf-preview-store";

type DeckLayout = NonNullable<Deck["layout"]>;
type ImageLayout = DeckLayout["images"]["image_list"][number];
type StatLayout = DeckLayout["information"]["stats"][number];
type CornerName = "bottom-left" | "top-right";

function getPreviewSnapshot(): PdfPreviewDraft | null {
    return readPdfPreviewDraft();
}

function getServerPreviewSnapshot(): null {
    return null;
}

function boxStyle(box: LayoutBox): CSSProperties {
    const [left, bottom] = box["bottom-left"];
    const [right, top] = box["top-right"];

    return {
        left: `${left * 100}%`,
        top: `${(1 - top) * 100}%`,
        width: `${(right - left) * 100}%`,
        height: `${(top - bottom) * 100}%`,
    };
}

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(1, Math.max(0, value));
}

function normalizeKey(value: string): string {
    return value.trim().toLowerCase();
}

function isBackImageSlot(slotName: string): boolean {
    return normalizeKey(slotName) === "back";
}

function isRemoteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

function getImageReference(
    deck: Deck,
    slotName: string,
): string | undefined {
    const card = deck.cards[0];

    if (!card) {
        return undefined;
    }

    const entry = Object.entries(card.images ?? {}).find(
        ([key]) => normalizeKey(key) === normalizeKey(slotName),
    );

    return entry?.[1];
}

function getImageSource(
    reference: string | undefined,
    files: Map<string, File>,
): string | undefined {
    if (!reference) {
        return undefined;
    }

    if (isRemoteUrl(reference)) {
        return reference;
    }

    const file = files.get(reference);

    if (!file) {
        return undefined;
    }

    return URL.createObjectURL(file);
}

function safeId(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function updateBoxCoordinate(
    box: LayoutBox,
    corner: CornerName,
    axis: 0 | 1,
    value: string,
): LayoutBox {
    const nextCoordinate: [number, number] = [...box[corner]];

    nextCoordinate[axis] = clampUnit(Number(value));

    return {
        ...box,
        [corner]: nextCoordinate,
    };
}

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
    const reference = backLayout
        ? getImageReference(deck, backLayout.name)
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

function LayoutPreview({
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

function CoordinateInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: string) => void;
}) {
    return (
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>{label}</span>
            <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm font-normal normal-case tracking-normal text-slate-100 outline-none focus:border-violet-500"
            />
        </label>
    );
}

function BoxEditor({
    title,
    box,
    onChange,
    children,
}: {
    title: string;
    box: LayoutBox;
    onChange: (box: LayoutBox) => void;
    children?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-200">
                    {title}
                </h2>
                {children}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <CoordinateInput
                    label="Left"
                    value={box["bottom-left"][0]}
                    onChange={(value) =>
                        onChange(
                            updateBoxCoordinate(
                                box,
                                "bottom-left",
                                0,
                                value,
                            ),
                        )
                    }
                />

                <CoordinateInput
                    label="Bottom"
                    value={box["bottom-left"][1]}
                    onChange={(value) =>
                        onChange(
                            updateBoxCoordinate(
                                box,
                                "bottom-left",
                                1,
                                value,
                            ),
                        )
                    }
                />

                <CoordinateInput
                    label="Right"
                    value={box["top-right"][0]}
                    onChange={(value) =>
                        onChange(
                            updateBoxCoordinate(
                                box,
                                "top-right",
                                0,
                                value,
                            ),
                        )
                    }
                />

                <CoordinateInput
                    label="Top"
                    value={box["top-right"][1]}
                    onChange={(value) =>
                        onChange(
                            updateBoxCoordinate(
                                box,
                                "top-right",
                                1,
                                value,
                            ),
                        )
                    }
                />
            </div>
        </div>
    );
}

export default function LayoutPage() {
    const router = useRouter();
    const draft = useSyncExternalStore(
        subscribeToPdfPreviewStore,
        getPreviewSnapshot,
        getServerPreviewSnapshot,
    );
    const [message, setMessage] = useState("");

    if (!draft) {
        return (
            <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
                <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
                    <div className="max-w-md text-center">
                        <h1 className="text-2xl font-bold">
                            No layout draft is ready
                        </h1>

                        <Link
                            href="/"
                            className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500"
                        >
                            Open setup
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const deck = draft.deck;
    const artworkFiles = draft.artworkFiles;
    const layout = deck.layout;

    function updateLayout(nextLayout: DeckLayout): void {
        updatePdfPreviewDeck({
            ...deck,
            layout: nextLayout,
        });
    }

    function updateImageLayout(
        index: number,
        nextImageLayout: ImageLayout,
    ): void {
        if (!layout) {
            return;
        }

        updateLayout({
            ...layout,
            images: {
                ...layout.images,
                image_list: layout.images.image_list.map(
                    (imageLayout, imageIndex) =>
                        imageIndex === index
                            ? nextImageLayout
                            : imageLayout,
                ),
            },
        });
    }

    function updateStatLayout(
        index: number,
        nextStatLayout: StatLayout,
    ): void {
        if (!layout) {
            return;
        }

        updateLayout({
            ...layout,
            information: {
                ...layout.information,
                stats: layout.information.stats.map(
                    (statLayout, statIndex) =>
                        statIndex === index
                            ? nextStatLayout
                            : statLayout,
                ),
            },
        });
    }

    function moveImageLayout(index: number, direction: -1 | 1): void {
        if (!layout) {
            return;
        }

        const nextIndex = index + direction;

        if (
            nextIndex < 0 ||
            nextIndex >= layout.images.image_list.length
        ) {
            return;
        }

        const imageList = [...layout.images.image_list];
        const selected = imageList[index];

        imageList[index] = imageList[nextIndex];
        imageList[nextIndex] = selected;

        updateLayout({
            ...layout,
            images: {
                ...layout.images,
                image_list: imageList,
            },
        });
    }

    function downloadJson(): void {
        const blob = new Blob([JSON.stringify(deck, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `${safeId(deck.deckName) || "trading-cards"}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setMessage("Edited JSON downloaded.");
    }

    function continueToPreview(): void {
        const imageReferences = deck.cards.flatMap((card) => [
            ...(card.image ? [card.image] : []),
            ...Object.values(card.images ?? {}),
        ]);

        const missingImages = imageReferences
            .filter((filename): filename is string => Boolean(filename))
            .filter((filename) => !isRemoteUrl(filename))
            .filter((filename) => !artworkFiles.has(filename));

        if (missingImages.length > 0) {
            setMessage(
                `Missing artwork files:\n${[
                    ...new Set(missingImages),
                ].join("\n")}`,
            );
            return;
        }

        router.push("/preview");
    }

    if (!layout) {
        return (
            <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
                <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
                    <div className="max-w-md text-center">
                        <h1 className="text-2xl font-bold">
                            No layout block found
                        </h1>

                        <div className="mt-6 flex justify-center gap-3">
                            <Link
                                href="/"
                                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold transition hover:border-slate-500 hover:bg-slate-900"
                            >
                                Back
                            </Link>

                            <Link
                                href="/preview"
                                className="rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500"
                            >
                                Preview
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
            <div className="mx-auto flex max-w-7xl flex-col gap-5">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-2 font-semibold uppercase tracking-widest text-violet-400">
                            MyTradingCards
                        </p>

                        <h1 className="text-3xl font-bold">
                            Edit layout
                        </h1>

                        <p className="mt-2 text-sm text-slate-300">
                            {deck.deckName}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/"
                            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold transition hover:border-slate-500 hover:bg-slate-900"
                        >
                            Back to setup
                        </Link>

                        <button
                            type="button"
                            onClick={downloadJson}
                            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold transition hover:border-slate-500 hover:bg-slate-900"
                        >
                            Save JSON
                        </button>

                        <button
                            type="button"
                            onClick={continueToPreview}
                            className="rounded-xl bg-violet-600 px-5 py-3 text-center font-semibold transition hover:bg-violet-500"
                        >
                            Continue
                        </button>
                    </div>
                </header>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
                    <section className="flex min-h-[70vh] items-start justify-center rounded-xl bg-slate-900 p-6">
                        <LayoutPreview
                            layout={layout}
                            deck={deck}
                            files={artworkFiles}
                        />
                    </section>

                    <section className="space-y-4 rounded-xl bg-slate-900 p-5">
                        <BoxEditor
                            title="Title"
                            box={layout.title}
                            onChange={(box) =>
                                updateLayout({
                                    ...layout,
                                    title: box,
                                })
                            }
                        />

                        <BoxEditor
                            title="Information"
                            box={layout.information}
                            onChange={(box) =>
                                updateLayout({
                                    ...layout,
                                    information: {
                                        ...layout.information,
                                        ...box,
                                    },
                                })
                            }
                        />

                        <BoxEditor
                            title="Description"
                            box={layout.information.description}
                            onChange={(box) =>
                                updateLayout({
                                    ...layout,
                                    information: {
                                        ...layout.information,
                                        description: box,
                                    },
                                })
                            }
                        />

                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-300">
                                Images
                            </h2>

                            {layout.images.image_list.map(
                                (imageLayout, index) => (
                                    <BoxEditor
                                        key={`${imageLayout.name}-${index}`}
                                        title={imageLayout.name}
                                        box={imageLayout}
                                        onChange={(box) =>
                                            updateImageLayout(index, {
                                                ...imageLayout,
                                                ...box,
                                            })
                                        }
                                    >
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    moveImageLayout(
                                                        index,
                                                        -1,
                                                    )
                                                }
                                                disabled={index === 0}
                                                className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Up
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    moveImageLayout(
                                                        index,
                                                        1,
                                                    )
                                                }
                                                disabled={
                                                    index ===
                                                    layout.images
                                                        .image_list
                                                        .length -
                                                        1
                                                }
                                                className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Down
                                            </button>
                                        </div>
                                    </BoxEditor>
                                ),
                            )}
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-300">
                                Stats
                            </h2>

                            {layout.information.stats.map(
                                (statLayout, index) => (
                                    <BoxEditor
                                        key={`${statLayout.label}-${index}`}
                                        title={statLayout.label}
                                        box={statLayout}
                                        onChange={(box) =>
                                            updateStatLayout(index, {
                                                ...statLayout,
                                                ...box,
                                            })
                                        }
                                    />
                                ),
                            )}
                        </div>

                        {message ? (
                            <p className="rounded-lg bg-slate-950 p-3 text-sm text-slate-300">
                                {message}
                            </p>
                        ) : null}
                    </section>
                </div>
            </div>
        </main>
    );
}
