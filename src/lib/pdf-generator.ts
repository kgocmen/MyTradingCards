import {
    PDFDocument,
} from "pdf-lib";

import type { Deck } from "@/lib/deck-schema";
import {
    renderBackToPng,
    renderCardToPng,
} from "@/lib/card-renderer";
import {
    getCardImageReference,
    isBackImageSlot,
} from "@/lib/deck-utils";

const MM_TO_POINTS = 72 / 25.4;

// A4 page
const PAGE_WIDTH = 210 * MM_TO_POINTS;
const PAGE_HEIGHT = 297 * MM_TO_POINTS;

// Standard poker/trading-card dimensions
const CARD_WIDTH = 63.5 * MM_TO_POINTS;
const CARD_HEIGHT = 88.9 * MM_TO_POINTS;

const COLUMNS = 3;
const ROWS = 3;
const CARDS_PER_PAGE = COLUMNS * ROWS;

const HORIZONTAL_GAP = 0 * MM_TO_POINTS;
const VERTICAL_GAP = 0 * MM_TO_POINTS;

const GRID_WIDTH =
    COLUMNS * CARD_WIDTH +
    (COLUMNS - 1) * HORIZONTAL_GAP;

const GRID_HEIGHT =
    ROWS * CARD_HEIGHT +
    (ROWS - 1) * VERTICAL_GAP;

const START_X = (PAGE_WIDTH - GRID_WIDTH) / 2;
const START_Y = (PAGE_HEIGHT - GRID_HEIGHT) / 2;

function getCardPosition(
    index: number,
    mirrorHorizontally = false,
): { x: number; y: number } {
    const row = Math.floor(index / COLUMNS);
    const originalColumn = index % COLUMNS;

    const column = mirrorHorizontally
        ? COLUMNS - 1 - originalColumn
        : originalColumn;

    const x =
        START_X + column * (CARD_WIDTH + HORIZONTAL_GAP);

    const y =
        PAGE_HEIGHT -
        START_Y -
        CARD_HEIGHT -
        row * (CARD_HEIGHT + VERTICAL_GAP);

    return { x, y };
}

export async function generateDeckPdf(
    deck: Deck,
    artworkFiles: Map<string, File>,
): Promise<ArrayBuffer> {
    const pdf = await PDFDocument.create();
    const backSlot = deck.layout?.images.image_list.find(
        (imageLayout) => isBackImageSlot(imageLayout.name),
    );
    const sharedBackCard =
        backSlot
            ? deck.cards.find((card) =>
                  getCardImageReference(card, backSlot.name),
              )
            : undefined;
    const renderedBack = await renderBackToPng(
        sharedBackCard ?? deck.cards[0],
        deck.layout,
        artworkFiles,
    );
    const embeddedBack = await pdf.embedPng(renderedBack);

    pdf.setTitle(deck.deckName);
    pdf.setAuthor("MyTradingCards");
    pdf.setSubject("Printable trading-card deck");

    for (
        let pageStart = 0;
        pageStart < deck.cards.length;
        pageStart += CARDS_PER_PAGE
    ) {
        const cards = deck.cards.slice(
            pageStart,
            pageStart + CARDS_PER_PAGE,
        );

        // Front page
        const frontPage = pdf.addPage([
            PAGE_WIDTH,
            PAGE_HEIGHT,
        ]);

        for (let index = 0; index < cards.length; index += 1) {
            const card = cards[index];

            const renderedCard = await renderCardToPng(
                card,
                deck.layout,
                artworkFiles,
            );

            const embeddedCard = await pdf.embedPng(renderedCard);
            const { x, y } = getCardPosition(index);

            frontPage.drawImage(embeddedCard, {
                x,
                y,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
            });
        }

        // Back page
        const backPage = pdf.addPage([
            PAGE_WIDTH,
            PAGE_HEIGHT,
        ]);

        for (let index = 0; index < cards.length; index += 1) {
            /*
             * Mirror columns so backs align when printing
             * portrait pages using long-edge duplex printing.
             */
            const { x, y } = getCardPosition(index, true);

            backPage.drawImage(embeddedBack, {
                x,
                y,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
            });
        }
    }

    const bytes = await pdf.save();

    return bytes.slice().buffer as ArrayBuffer;
}
