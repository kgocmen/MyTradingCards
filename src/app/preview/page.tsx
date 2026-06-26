"use client";

import Link from "next/link";
import {
    useMemo,
    useState,
    useSyncExternalStore,
    type CSSProperties,
    type ChangeEvent,
} from "react";

import type {
    Card,
    Deck,
    LayoutBox,
} from "@/lib/deck-schema";
import { generateDeckPdf } from "@/lib/pdf-generator";
import {
    readPdfPreviewDraft,
    storePdfPreviewUrl,
    subscribeToPdfPreviewStore,
    updatePdfPreviewDeck,
    type PdfPreviewDraft,
} from "@/lib/pdf-preview-store";

function getPreviewSnapshot(): PdfPreviewDraft | null {
    return readPdfPreviewDraft();
}

function getServerPreviewSnapshot(): null {
    return null;
}

function isRemoteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
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

function normalizeKey(value: string): string {
    return value.trim().toLowerCase();
}

function isBackImageSlot(slotName: string): boolean {
    return normalizeKey(slotName) === "back";
}

function getImageReference(
    card: Card,
    slotName: string,
): string | undefined {
    const entry = Object.entries(card.images ?? {}).find(
        ([key]) => normalizeKey(key) === normalizeKey(slotName),
    );

    return entry?.[1];
}

function setImageReference(
    card: Card,
    slotName: string,
    value: string,
): Card {
    const existingKey = Object.keys(card.images ?? {}).find(
        (key) => normalizeKey(key) === normalizeKey(slotName),
    );

    const nextImages = {
        ...(card.images ?? {}),
    };

    if (value.trim()) {
        nextImages[existingKey ?? slotName] = value;
    } else if (existingKey) {
        delete nextImages[existingKey];
    }

    return {
        ...card,
        images:
            Object.keys(nextImages).length > 0
                ? nextImages
                : undefined,
    };
}

function safeId(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function createCard(deck: Deck, index: number): Card {
    const statLabels =
        deck.layout?.information.stats.map((stat) => stat.label) ??
        deck.cards[0]?.stats.map((stat) => stat.label) ??
        [];
    const name = `New Card ${index + 1}`;

    return {
        id: safeId(name),
        name,
        category: deck.cards[0]?.category ?? "Trading Card",
        description: "",
        stats: statLabels.map((label) => ({
            label,
            value: 0,
        })),
    };
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

function CardPreview({
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
        <div className="aspect-[5/7] w-full max-w-sm overflow-hidden rounded border-4 border-slate-950 bg-white shadow-2xl">
            <div className="relative h-full w-full">
                <div
                    className="absolute bg-red-700 text-white"
                    style={boxStyle(layout.title)}
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

                    const reference = getImageReference(
                        card,
                        imageLayout.name,
                    );

                    return (
                        <div
                            key={imageLayout.name}
                            className="absolute overflow-hidden border-2 border-slate-950"
                            style={{
                                ...boxStyle(imageLayout),
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
                    style={boxStyle(layout.information)}
                />

                <div
                    className="absolute px-4 py-3 text-sm font-semibold leading-tight text-slate-700"
                    style={boxStyle(layout.information.description)}
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
                            style={boxStyle(statLayout)}
                        >
                            <span className="text-slate-800">
                                {statLayout.label}
                            </span>
                            <span className="text-red-800">
                                {stat?.value ?? "-"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function PreviewPage() {
    const draft = useSyncExternalStore(
        subscribeToPdfPreviewStore,
        getPreviewSnapshot,
        getServerPreviewSnapshot,
    );
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [message, setMessage] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    if (!draft) {
        return (
            <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
                <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
                    <div className="max-w-md text-center">
                        <h1 className="text-2xl font-bold">
                            No preview draft is ready
                        </h1>

                        <p className="mt-3 text-slate-300">
                            Generate a preview from the editor first.
                        </p>

                        <Link
                            href="/"
                            className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500"
                        >
                            Open editor
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const currentDraft = draft;
    const deck = currentDraft.deck;
    const selectedCard =
        deck.cards[Math.min(selectedIndex, deck.cards.length - 1)];

    function updateSelectedCard(nextCard: Card): void {
        const nextDeck = {
            ...deck,
            cards: deck.cards.map((card, index) =>
                index === selectedIndex ? nextCard : card,
            ),
        };

        updatePdfPreviewDeck(nextDeck);
    }

    function addCard(): void {
        const nextCard = createCard(deck, deck.cards.length);
        const nextDeck = {
            ...deck,
            cards: [...deck.cards, nextCard],
        };

        updatePdfPreviewDeck(nextDeck);
        setSelectedIndex(nextDeck.cards.length - 1);
        setMessage(`Added ${nextCard.name}.`);
    }

    function removeSelectedCard(): void {
        if (!selectedCard || deck.cards.length <= 1) {
            return;
        }

        const nextDeck = {
            ...deck,
            cards: deck.cards.filter(
                (_card, index) => index !== selectedIndex,
            ),
        };
        const nextIndex = Math.max(0, selectedIndex - 1);

        updatePdfPreviewDeck(nextDeck);
        setSelectedIndex(nextIndex);
        setMessage(`Removed ${selectedCard.name}.`);
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

    function updateStat(
        statLabel: string,
        value: string,
    ): void {
        if (!selectedCard) {
            return;
        }

        updateSelectedCard({
            ...selectedCard,
            stats: selectedCard.stats.map((stat) =>
                stat.label === statLabel
                    ? {
                          ...stat,
                          value,
                      }
                    : stat,
            ),
        });
    }

    function updateImageFile(
        slotName: string,
        event: ChangeEvent<HTMLInputElement>,
    ): void {
        const file = event.target.files?.[0];

        if (!file || !selectedCard) {
            return;
        }

        currentDraft.artworkFiles.set(file.name, file);
        updateSelectedCard(
            setImageReference(selectedCard, slotName, file.name),
        );
    }

    async function downloadPdf(): Promise<void> {
        setIsGenerating(true);
        setMessage("Generating PDF...");

        try {
            const pdfBuffer = await generateDeckPdf(
                deck,
                currentDraft.artworkFiles,
            );
            const blob = new Blob([pdfBuffer], {
                type: "application/pdf",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            storePdfPreviewUrl(url);
            link.href = url;
            link.download = currentDraft.filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setMessage("PDF downloaded.");
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not generate the PDF.",
            );
        } finally {
            setIsGenerating(false);
        }
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
                            Preview and edit
                        </h1>

                        <p className="mt-2 text-sm text-slate-300">
                            {deck.cards.length} printable card(s)
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/"
                            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold transition hover:border-slate-500 hover:bg-slate-900"
                        >
                            Back to editor
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
                            onClick={downloadPdf}
                            disabled={isGenerating}
                            className="rounded-xl bg-violet-600 px-5 py-3 text-center font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isGenerating
                                ? "Generating..."
                                : "Download PDF"}
                        </button>
                    </div>
                </header>

                <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_360px]">
                    <aside className="rounded-xl bg-slate-900 p-3">
                        <div className="mb-3 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={addCard}
                                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold transition hover:bg-violet-500"
                            >
                                Add
                            </button>

                            <button
                                type="button"
                                onClick={removeSelectedCard}
                                disabled={deck.cards.length <= 1}
                                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Remove
                            </button>
                        </div>

                        <div className="space-y-2">
                            {deck.cards.map((card, index) => (
                                <button
                                    key={card.id ?? card.name}
                                    type="button"
                                    onClick={() => setSelectedIndex(index)}
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

                    <section className="flex min-h-[70vh] items-start justify-center rounded-xl bg-slate-900 p-6">
                        {selectedCard ? (
                            <CardPreview
                                deck={deck}
                                card={selectedCard}
                                files={currentDraft.artworkFiles}
                            />
                        ) : null}
                    </section>

                    {selectedCard ? (
                        <section className="space-y-4 rounded-xl bg-slate-900 p-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-300">
                                    Name
                                </label>

                                <input
                                    value={selectedCard.name}
                                    onChange={(event) =>
                                        updateSelectedCard({
                                            ...selectedCard,
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
                                    value={selectedCard.category ?? ""}
                                    onChange={(event) =>
                                        updateSelectedCard({
                                            ...selectedCard,
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
                                    value={selectedCard.description ?? ""}
                                    onChange={(event) =>
                                        updateSelectedCard({
                                            ...selectedCard,
                                            description:
                                                event.target.value,
                                        })
                                    }
                                    className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold text-slate-300">
                                    Images
                                </h2>

                                {deck.layout?.images.image_list.map(
                                    (imageLayout) => {
                                        const reference =
                                            getImageReference(
                                                selectedCard,
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
                                                        updateSelectedCard(
                                                            setImageReference(
                                                                selectedCard,
                                                                imageLayout.name,
                                                                event
                                                                    .target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                                                />

                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg"
                                                    onChange={(event) =>
                                                        updateImageFile(
                                                            imageLayout.name,
                                                            event,
                                                        )
                                                    }
                                                    className="block w-full text-xs text-slate-300"
                                                />
                                            </div>
                                        );
                                    },
                                )}
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold text-slate-300">
                                    Stats
                                </h2>

                                {selectedCard.stats.map((stat) => (
                                    <label
                                        key={stat.label}
                                        className="grid grid-cols-[1fr_90px] items-center gap-3 text-sm text-slate-300"
                                    >
                                        <span>{stat.label}</span>

                                        <input
                                            value={stat.value}
                                            onChange={(event) =>
                                                updateStat(
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
                    ) : null}
                </div>
            </div>
        </main>
    );
}
