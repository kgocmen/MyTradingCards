"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useState,
    useSyncExternalStore,
} from "react";

import { LayoutForm } from "@/app/layout/_components/layout-form";
import { LayoutPreview } from "@/app/layout/_components/layout-preview";
import type { Deck } from "@/lib/deck-schema";
import {
    getMissingLocalImages,
    safeFilename,
} from "@/lib/deck-utils";
import {
    readPdfPreviewDraft,
    subscribeToPdfPreviewStore,
    updatePdfPreviewDeck,
    type PdfPreviewDraft,
} from "@/lib/pdf-preview-store";

type DeckLayout = NonNullable<Deck["layout"]>;
type ImageLayout = DeckLayout["images"]["image_list"][number];
type StatLayout = DeckLayout["information"]["stats"][number];

function getPreviewSnapshot(): PdfPreviewDraft | null {
    return readPdfPreviewDraft();
}

function getServerPreviewSnapshot(): null {
    return null;
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
        link.download = `${
            safeFilename(deck.deckName) || "trading-cards"
        }.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setMessage("Edited JSON downloaded.");
    }

    function continueToPreview(): void {
        const missingImages = getMissingLocalImages(deck, artworkFiles);

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

                    <LayoutForm
                        layout={layout}
                        message={message}
                        onChangeLayout={updateLayout}
                        onChangeImageLayout={updateImageLayout}
                        onChangeStatLayout={updateStatLayout}
                        onMoveImageLayout={moveImageLayout}
                    />
                </div>
            </div>
        </main>
    );
}
