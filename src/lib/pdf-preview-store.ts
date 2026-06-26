import type { Deck } from "@/lib/deck-schema";

export type PdfPreviewDraft = {
    deck: Deck;
    filename: string;
    artworkFiles: Map<string, File>;
};

const STORAGE_KEY = "my-trading-cards:pdf-preview";

let activePreviewUrl: string | null = null;
let activeDraft: PdfPreviewDraft | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
    listeners.forEach((listener) => listener());
}

export function subscribeToPdfPreviewStore(
    listener: () => void,
): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function storePdfPreviewDraft(draft: PdfPreviewDraft): void {
    activeDraft = draft;
    sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            deck: draft.deck,
            filename: draft.filename,
        }),
    );
    notifyListeners();
}

export function updatePdfPreviewDeck(deck: Deck): void {
    if (!activeDraft) {
        return;
    }

    activeDraft = {
        ...activeDraft,
        deck,
    };

    sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            deck,
            filename: activeDraft.filename,
        }),
    );
    notifyListeners();
}

export function readPdfPreviewDraft(): PdfPreviewDraft | null {
    if (activeDraft) {
        return activeDraft;
    }

    if (typeof sessionStorage === "undefined") {
        return null;
    }

    const storedPreview = sessionStorage.getItem(STORAGE_KEY);

    if (!storedPreview) {
        return null;
    }

    try {
        const parsedPreview = JSON.parse(storedPreview) as Pick<
            PdfPreviewDraft,
            "deck" | "filename"
        >;

        activeDraft = {
            deck: parsedPreview.deck,
            filename: parsedPreview.filename,
            artworkFiles: new Map(),
        };

        return activeDraft;
    } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

export function storePdfPreviewUrl(url: string): void {
    if (activePreviewUrl) {
        URL.revokeObjectURL(activePreviewUrl);
    }

    activePreviewUrl = url;
}
