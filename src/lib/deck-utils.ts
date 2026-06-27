import type {
    Card,
    Deck,
} from "@/lib/deck-schema";

export function safeFilename(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function isRemoteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

export function normalizeKey(value: string): string {
    return value.trim().toLowerCase();
}

export function isBackImageSlot(slotName: string): boolean {
    return normalizeKey(slotName) === "back";
}

export function getCardImageReference(
    card: Card,
    slotName: string,
): string | undefined {
    const entry = Object.entries(card.images ?? {}).find(
        ([key]) => normalizeKey(key) === normalizeKey(slotName),
    );

    return entry?.[1];
}

export function getLayoutImageReference(
    deck: Deck,
    slotName: string,
): string | undefined {
    const imageLayout = deck.layout?.images.image_list.find(
        (candidate) =>
            normalizeKey(candidate.name) === normalizeKey(slotName),
    );

    return imageLayout?.url;
}

export function getDeckImageReference(
    deck: Deck,
    slotName: string,
): string | undefined {
    return getLayoutImageReference(deck, slotName) ?? deck.cards
        .map((card) => getCardImageReference(card, slotName))
        .find((reference): reference is string => Boolean(reference));
}

export function setCardImageReference(
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

export function setDeckImageReference(
    deck: Deck,
    slotName: string,
    value: string,
): Deck {
    if (deck.layout) {
        return {
            ...deck,
            layout: {
                ...deck.layout,
                images: {
                    ...deck.layout.images,
                    image_list: deck.layout.images.image_list.map(
                        (imageLayout) => {
                            if (
                                normalizeKey(imageLayout.name) !==
                                normalizeKey(slotName)
                            ) {
                                return imageLayout;
                            }

                            if (!value.trim()) {
                                const nextImageLayout = {
                                    ...imageLayout,
                                };

                                delete nextImageLayout.url;
                                return nextImageLayout;
                            }

                            return {
                                ...imageLayout,
                                url: value,
                            };
                        },
                    ),
                },
            },
        };
    }

    return {
        ...deck,
        cards: deck.cards.map((card) =>
            setCardImageReference(card, slotName, value),
        ),
    };
}

export function createCard(deck: Deck, index: number): Card {
    const statLabels =
        deck.layout?.information.stats.map((stat) => stat.label) ??
        deck.cards[0]?.stats.map((stat) => stat.label) ??
        [];
    const name = `New Card ${index + 1}`;

    return {
        id: safeFilename(name),
        name,
        category: deck.cards[0]?.category ?? "Trading Card",
        description: "",
        stats: statLabels.map((label) => ({
            label,
            value: 0,
        })),
    };
}

export function getDeckImageReferences(deck: Deck): string[] {
    return [
        ...(deck.layout?.images.image_list
            .map((imageLayout) => imageLayout.url)
            .filter(
                (reference): reference is string =>
                    Boolean(reference),
            ) ?? []),
        ...deck.cards.flatMap((card) => [
            ...(card.image ? [card.image] : []),
            ...Object.values(card.images ?? {}),
        ]),
    ];
}

export function getMissingLocalImages(
    deck: Deck,
    artworkFiles: Map<string, File>,
): string[] {
    return getDeckImageReferences(deck)
        .filter((filename): filename is string => Boolean(filename))
        .filter((filename) => !isRemoteUrl(filename))
        .filter((filename) => !artworkFiles.has(filename));
}

export function getImageSource(
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
