"use client";

import Link from "next/link";
import {
    useState,
    useSyncExternalStore,
    type ChangeEvent,
} from "react";

import { CardEditPanel } from "@/app/preview/_components/card-edit-panel";
import { CardList } from "@/app/preview/_components/card-list";
import { CardPreview } from "@/components/card-preview";
import type { Card } from "@/lib/deck-schema";
import {
    createCard,
    safeFilename,
    setCardImageReference,
} from "@/lib/deck-utils";
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
        link.download = `${
            safeFilename(deck.deckName) || "trading-cards"
        }.json`;
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
            setCardImageReference(selectedCard, slotName, file.name),
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
                    <CardList
                        cards={deck.cards}
                        selectedIndex={selectedIndex}
                        onSelect={setSelectedIndex}
                        onAdd={addCard}
                        onRemove={removeSelectedCard}
                    />

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
                        <CardEditPanel
                            deck={deck}
                            card={selectedCard}
                            message={message}
                            onChangeCard={updateSelectedCard}
                            onChangeStat={updateStat}
                            onChangeImageFile={updateImageFile}
                        />
                    ) : null}
                </div>
            </div>
        </main>
    );
}
