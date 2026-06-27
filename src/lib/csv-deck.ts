import type {
    Card,
    Deck,
    LayoutBox,
} from "@/lib/deck-schema";
import { safeFilename } from "@/lib/deck-utils";

function parseCsvRows(text: string): string[][] {
    const rows: string[][] = [];
    let currentCell = "";
    let currentRow: string[] = [];
    let insideQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        const nextCharacter = text[index + 1];

        if (character === '"' && insideQuotes && nextCharacter === '"') {
            currentCell += '"';
            index += 1;
            continue;
        }

        if (character === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (character === "," && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = "";
            continue;
        }

        if (
            (character === "\n" || character === "\r") &&
            !insideQuotes
        ) {
            if (character === "\r" && nextCharacter === "\n") {
                index += 1;
            }

            currentRow.push(currentCell.trim());
            currentCell = "";

            if (currentRow.some((cell) => cell.length > 0)) {
                rows.push(currentRow);
            }

            currentRow = [];
            continue;
        }

        currentCell += character;
    }

    currentRow.push(currentCell.trim());

    if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
    }

    return rows;
}

function coerceStatValue(value: string): string | number {
    const numericValue = Number(value);

    if (value.trim() && Number.isFinite(numericValue)) {
        return numericValue;
    }

    return value;
}

function makeStatLayout(
    labels: string[],
    sampleLayout: NonNullable<Deck["layout"]>,
): NonNullable<Deck["layout"]>["information"]["stats"] {
    const informationBox = sampleLayout.information;
    const descriptionBottom =
        informationBox.description["bottom-left"][1];
    const bottom = informationBox["bottom-left"][1];
    const rowHeight = (descriptionBottom - bottom) / labels.length;

    return labels.map((label, index) => {
        const rowBottom = bottom + rowHeight * (labels.length - index - 1);
        const rowTop = rowBottom + rowHeight;

        return {
            label,
            "bottom-left": [
                informationBox["bottom-left"][0],
                rowBottom,
            ] as LayoutBox["bottom-left"],
            "top-right": [
                informationBox["top-right"][0],
                rowTop,
            ] as LayoutBox["top-right"],
        };
    });
}

export function csvToDeck(
    text: string,
    sampleDeck: Deck,
): Deck {
    const rows = parseCsvRows(text);

    if (rows.length < 2) {
        throw new Error(
            "CSV must include a header row and at least one card row.",
        );
    }

    const headers = rows[0].map((header) => header.trim());
    const nameIndex = headers.findIndex(
        (header) => header.toLowerCase() === "name",
    );
    const categoryIndex = headers.findIndex(
        (header) => header.toLowerCase() === "category",
    );
    const descriptionIndex = headers.findIndex(
        (header) => header.toLowerCase() === "description",
    );

    if (nameIndex === -1) {
        throw new Error('CSV must include a "name" column.');
    }

    const statColumns = headers
        .map((label, index) => ({
            label,
            index,
        }))
        .filter(
            (column) =>
                ![
                    nameIndex,
                    categoryIndex,
                    descriptionIndex,
                ].includes(column.index) &&
                column.label.length > 0,
        );

    if (statColumns.length === 0) {
        throw new Error("CSV must include at least one stat column.");
    }

    if (statColumns.length > 8) {
        throw new Error("CSV can include at most 8 stat columns.");
    }

    return {
        ...sampleDeck,
        deckName: `${sampleDeck.deckName} CSV`,
        layout: sampleDeck.layout
            ? {
                  ...sampleDeck.layout,
                  information: {
                      ...sampleDeck.layout.information,
                      stats: makeStatLayout(
                          statColumns.map((column) => column.label),
                          sampleDeck.layout,
                      ),
                  },
              }
            : undefined,
        cards: rows.slice(1).map((row, index): Card => {
            const name = row[nameIndex]?.trim();
            const category =
                categoryIndex >= 0
                    ? row[categoryIndex]?.trim()
                    : undefined;
            const description =
                descriptionIndex >= 0
                    ? row[descriptionIndex]?.trim()
                    : undefined;

            if (!name) {
                throw new Error(
                    `CSV row ${index + 2} is missing a name.`,
                );
            }

            const card: Card = {
                id: safeFilename(name),
                name,
                stats: statColumns.map((column) => ({
                    label: column.label,
                    value: coerceStatValue(row[column.index] ?? ""),
                })),
            };

            if (category) {
                card.category = category;
            }

            if (description) {
                card.description = description;
            }

            return card;
        }),
    };
}
