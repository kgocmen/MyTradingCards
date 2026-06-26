import type {
    Card,
    Deck,
} from "@/lib/deck-schema";
import {
    getCardImageReference,
    isBackImageSlot,
} from "@/lib/deck-utils";
import {
    CANVAS_WIDTH,
    boxToPixels,
    drawBoxBorder,
    drawImageCover,
    drawPlaceholder,
    drawStatRow,
    drawWrappedText,
    fitTitle,
    loadImage,
    roundedRectangle,
} from "@/lib/card-renderer-primitives";
import { resolveImageSource } from "@/lib/card-renderer-sources";

export async function drawLayoutCard(
    context: CanvasRenderingContext2D,
    card: Card,
    layout: NonNullable<Deck["layout"]>,
    artworkFiles: Map<string, File>,
): Promise<void> {
    const titleBox = boxToPixels(layout.title);

    context.fillStyle = "#b91c1c";
    context.fillRect(
        titleBox.x,
        titleBox.y,
        titleBox.width,
        titleBox.height,
    );

    const titleSize = fitTitle(
        context,
        card.name,
        titleBox.width * 0.9,
        titleBox.height * 0.42,
        18,
    );

    context.fillStyle = "#ffffff";
    context.font = `700 ${titleSize}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
        card.name,
        titleBox.x + titleBox.width / 2,
        titleBox.y + titleBox.height * 0.45,
    );

    if (card.category) {
        context.font = `700 ${Math.max(13, titleBox.height * 0.15)}px Arial, sans-serif`;
        context.fillText(
            card.category.toUpperCase(),
            titleBox.x + titleBox.width / 2,
            titleBox.y + titleBox.height * 0.78,
        );
    }

    for (const imageLayout of layout.images.image_list) {
        if (isBackImageSlot(imageLayout.name)) {
            continue;
        }

        const imageBox = boxToPixels(imageLayout);
        const reference = getCardImageReference(
            card,
            imageLayout.name,
        );
        const source = resolveImageSource(reference, artworkFiles);

        context.save();
        context.beginPath();
        context.rect(
            imageBox.x,
            imageBox.y,
            imageBox.width,
            imageBox.height,
        );
        context.clip();

        if (source) {
            try {
                const image = await loadImage(source);
                drawImageCover(
                    context,
                    image,
                    imageBox.x,
                    imageBox.y,
                    imageBox.width,
                    imageBox.height,
                );
            } catch {
                drawPlaceholder(context, imageBox, card.name);
            }
        } else {
            drawPlaceholder(context, imageBox, card.name);
        }

        context.restore();
        drawBoxBorder(context, imageBox, "#111827", 4);
    }

    const informationBox = boxToPixels(layout.information);

    context.fillStyle = "#ffffff";
    context.fillRect(
        informationBox.x,
        informationBox.y,
        informationBox.width,
        informationBox.height,
    );

    const descriptionBox = boxToPixels(
        layout.information.description,
    );

    context.fillStyle = "#334155";
    context.font = `600 ${Math.max(18, descriptionBox.height * 0.27)}px Arial, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "top";

    drawWrappedText(
        context,
        card.description ?? "",
        descriptionBox.x + descriptionBox.width * 0.05,
        descriptionBox.y + descriptionBox.height * 0.18,
        descriptionBox.width * 0.9,
        descriptionBox.height * 0.3,
        2,
    );

    layout.information.stats.forEach((statLayout, index) => {
        const box = boxToPixels(statLayout);
        const stat = card.stats.find(
            (candidate) => candidate.label === statLayout.label,
        );

        drawStatRow(
            context,
            box,
            statLayout.label,
            stat?.value ?? "-",
            index,
        );
    });

    context.strokeStyle = "#111827";
    context.lineWidth = 8;
    context.strokeRect(18, 18, 714, 1014);
}

export async function drawDefaultCard(
    context: CanvasRenderingContext2D,
    card: Card,
    artworkFiles: Map<string, File>,
): Promise<void> {
    const artwork = card.image
        ? resolveImageSource(card.image, artworkFiles)
        : undefined;

    roundedRectangle(context, 45, 45, 660, 105, 16);
    context.fillStyle = "#991b1b";
    context.fill();

    const titleSize = fitTitle(context, card.name, 610);

    context.fillStyle = "#ffffff";
    context.font = `700 ${titleSize}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(card.name, CANVAS_WIDTH / 2, 98);

    context.save();
    roundedRectangle(context, 55, 170, 640, 500, 16);
    context.clip();

    if (artwork) {
        try {
            drawImageCover(
                context,
                await loadImage(artwork),
                55,
                170,
                640,
                500,
            );
        } catch {
            drawPlaceholder(
                context,
                { x: 55, y: 170, width: 640, height: 500 },
                card.name,
            );
        }
    } else {
        drawPlaceholder(
            context,
            { x: 55, y: 170, width: 640, height: 500 },
            card.name,
        );
    }

    context.restore();

    context.lineWidth = 5;
    context.strokeStyle = "#312e81";
    roundedRectangle(context, 55, 170, 640, 500, 16);
    context.stroke();

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = "#7f1d1d";
    context.font = "700 27px Arial, sans-serif";
    context.fillText(card.category ?? "Trading Card", 60, 715);

    context.fillStyle = "#334155";
    context.font = "23px Arial, sans-serif";

    drawWrappedText(
        context,
        card.description ?? "",
        60,
        752,
        630,
        29,
        2,
    );

    const statsStartY = 805;
    const availableHeight = 190;
    const rowHeight = availableHeight / card.stats.length;

    card.stats.forEach((stat, index) => {
        const y = statsStartY + index * rowHeight;

        context.fillStyle = index % 2 === 0 ? "#e2e8f0" : "#f1f5f9";
        context.fillRect(55, y, 640, rowHeight - 3);

        context.fillStyle = "#1e293b";
        context.font = "700 22px Arial, sans-serif";
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillText(stat.label, 75, y + rowHeight / 2);

        context.fillStyle = "#991b1b";
        context.font = "700 27px Arial, sans-serif";
        context.textAlign = "right";
        context.fillText(
            String(stat.value),
            675,
            y + rowHeight / 2,
        );
    });
}
