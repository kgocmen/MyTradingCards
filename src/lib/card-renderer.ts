import type {
    Card,
    Deck,
} from "@/lib/deck-schema";
import {
    getCardImageReference,
    isBackImageSlot,
} from "@/lib/deck-utils";
import {
    drawDefaultCard,
    drawLayoutCard,
} from "@/lib/card-front-renderers";
import {
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    canvasToPng,
    drawImageCover,
    loadImage,
    roundedRectangle,
} from "@/lib/card-renderer-primitives";
import { resolveImageSource } from "@/lib/card-renderer-sources";

function createCardCanvas(): {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
} {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas rendering is not supported.");
    }

    return {
        canvas,
        context,
    };
}

function drawCardBase(context: CanvasRenderingContext2D): void {
    const background = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);

    background.addColorStop(0, "#b91c1c");
    background.addColorStop(0.45, "#f8fafc");
    background.addColorStop(1, "#e5e7eb");
    context.fillStyle = background;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    roundedRectangle(context, 18, 18, 714, 1014, 18);
    context.fillStyle = "#ffffff";
    context.fill();

    context.lineWidth = 8;
    context.strokeStyle = "#111827";
    context.stroke();
}

function drawDefaultBack(context: CanvasRenderingContext2D): void {
    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 5;

    for (
        let offset = -CANVAS_HEIGHT;
        offset < CANVAS_WIDTH;
        offset += 95
    ) {
        context.beginPath();
        context.moveTo(offset, CANVAS_HEIGHT);
        context.lineTo(offset + CANVAS_HEIGHT, 0);
        context.stroke();
    }

    context.fillStyle = "#111827";
    context.font = "700 58px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("MY TRADING", CANVAS_WIDTH / 2, 480);
    context.fillText("CARDS", CANVAS_WIDTH / 2, 550);
}

export async function renderCardToPng(
    card: Card,
    layout: Deck["layout"],
    artworkFiles: Map<string, File>,
): Promise<Uint8Array> {
    const { canvas, context } = createCardCanvas();

    drawCardBase(context);

    if (layout) {
        await drawLayoutCard(context, card, layout, artworkFiles);
    } else {
        await drawDefaultCard(context, card, artworkFiles);
    }

    return canvasToPng(canvas);
}

export async function renderBackToPng(
    card?: Card,
    layout?: Deck["layout"],
    artworkFiles: Map<string, File> = new Map(),
): Promise<Uint8Array> {
    const { canvas, context } = createCardCanvas();

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const backLayout = layout?.images.image_list.find((imageLayout) =>
        isBackImageSlot(imageLayout.name),
    );
    const backReference =
        card && backLayout
            ? getCardImageReference(card, backLayout.name)
            : undefined;
    const backSource = resolveImageSource(backReference, artworkFiles);

    if (backSource) {
        const image = await loadImage(backSource);

        drawImageCover(
            context,
            image,
            0,
            0,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
        );
    } else {
        drawDefaultBack(context);
    }

    context.lineWidth = 12;
    context.strokeStyle = "#111827";
    context.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);

    return canvasToPng(canvas);
}
