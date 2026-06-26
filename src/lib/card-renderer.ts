import type {
    Card,
    Deck,
    LayoutBox,
} from "@/lib/deck-schema";

const CANVAS_WIDTH = 750;
const CANVAS_HEIGHT = 1050;

type ImageSource = File | string;

type RenderBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

function isUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

function loadImage(source: ImageSource): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url =
            source instanceof File
                ? URL.createObjectURL(source)
                : source;

        image.onload = () => {
            if (source instanceof File) {
                URL.revokeObjectURL(url);
            }

            resolve(image);
        };

        image.onerror = () => {
            if (source instanceof File) {
                URL.revokeObjectURL(url);
            }

            const name =
                source instanceof File ? source.name : source;

            reject(new Error(`Could not load image: ${name}`));
        };

        if (typeof source === "string" && isUrl(source)) {
            image.crossOrigin = "anonymous";
        }

        image.src = url;
    });
}

function roundedRectangle(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): void {
    const r = Math.min(radius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(
        x + width,
        y + height,
        x + width - r,
        y + height,
    );
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
}

function drawImageCover(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
): void {
    const scale = Math.max(width / image.width, height / image.height);

    const renderedWidth = image.width * scale;
    const renderedHeight = image.height * scale;

    const offsetX = x + (width - renderedWidth) / 2;
    const offsetY = y + (height - renderedHeight) / 2;

    context.drawImage(
        image,
        offsetX,
        offsetY,
        renderedWidth,
        renderedHeight,
    );
}

function boxToPixels(box: LayoutBox): RenderBox {
    const [left, bottom] = box["bottom-left"];
    const [right, top] = box["top-right"];

    return {
        x: left * CANVAS_WIDTH,
        y: (1 - top) * CANVAS_HEIGHT,
        width: (right - left) * CANVAS_WIDTH,
        height: (top - bottom) * CANVAS_HEIGHT,
    };
}

function normalizeImageKey(value: string): string {
    return value.trim().toLowerCase();
}

function isBackImageSlot(slotName: string): boolean {
    return normalizeImageKey(slotName) === "back";
}

function findCardImage(
    card: Card,
    slotName: string,
): string | undefined {
    if (!card.images) {
        return undefined;
    }

    const normalizedSlotName = normalizeImageKey(slotName);
    const entry = Object.entries(card.images).find(
        ([key]) => normalizeImageKey(key) === normalizedSlotName,
    );

    return entry?.[1];
}

function resolveImageSource(
    reference: string | undefined,
    artworkFiles: Map<string, File>,
): ImageSource | undefined {
    if (!reference) {
        return undefined;
    }

    if (isUrl(reference)) {
        return reference;
    }

    return artworkFiles.get(reference);
}

function fitTitle(
    context: CanvasRenderingContext2D,
    text: string,
    maximumWidth: number,
    maximumSize = 50,
    minimumSize = 25,
): number {
    let size = maximumSize;

    while (size > minimumSize) {
        context.font = `700 ${size}px Arial, sans-serif`;

        if (context.measureText(text).width <= maximumWidth) {
            return size;
        }

        size -= 2;
    }

    return size;
}

function drawWrappedText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maximumWidth: number,
    lineHeight: number,
    maximumLines: number,
): void {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;

        if (
            context.measureText(testLine).width > maximumWidth &&
            currentLine
        ) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    lines.slice(0, maximumLines).forEach((line, index) => {
        context.fillText(line, x, y + index * lineHeight);
    });
}

function drawPlaceholder(
    context: CanvasRenderingContext2D,
    box: RenderBox,
    label: string,
): void {
    context.fillStyle = "#f8fafc";
    context.fillRect(box.x, box.y, box.width, box.height);

    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 4;

    for (
        let offset = -box.height;
        offset < box.width;
        offset += 75
    ) {
        context.beginPath();
        context.moveTo(box.x + offset, box.y + box.height);
        context.lineTo(box.x + offset + box.height, box.y);
        context.stroke();
    }

    const initials = label
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();

    context.fillStyle = "#991b1b";
    context.font = "700 56px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
        initials,
        box.x + box.width / 2,
        box.y + box.height / 2,
    );
}

function drawBoxBorder(
    context: CanvasRenderingContext2D,
    box: RenderBox,
    color = "#111827",
    lineWidth = 3,
): void {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.strokeRect(box.x, box.y, box.width, box.height);
}

function drawStatRow(
    context: CanvasRenderingContext2D,
    box: RenderBox,
    label: string,
    value: string | number,
    index: number,
): void {
    context.fillStyle = index % 2 === 0 ? "#e2e8f0" : "#f8fafc";
    context.fillRect(box.x, box.y, box.width, box.height);

    context.fillStyle = "#1e293b";
    context.font = `700 ${Math.max(16, box.height * 0.36)}px Arial, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(
        label,
        box.x + box.width * 0.05,
        box.y + box.height / 2,
        box.width * 0.62,
    );

    context.fillStyle = "#991b1b";
    context.font = `700 ${Math.max(18, box.height * 0.44)}px Arial, sans-serif`;
    context.textAlign = "right";
    context.fillText(
        String(value),
        box.x + box.width * 0.95,
        box.y + box.height / 2,
        box.width * 0.24,
    );
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
            if (!blob) {
                reject(new Error("Could not render card image."));
                return;
            }

            resolve(new Uint8Array(await blob.arrayBuffer()));
        }, "image/png");
    });
}

export async function renderCardToPng(
    card: Card,
    layout: Deck["layout"],
    artworkFiles: Map<string, File>,
): Promise<Uint8Array> {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas rendering is not supported.");
    }

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

    if (layout) {
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
            const reference = findCardImage(card, imageLayout.name);
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

        return canvasToPng(canvas);
    }

    const artwork = card.image
        ? resolveImageSource(card.image, artworkFiles)
        : undefined;

    // Header
    roundedRectangle(context, 45, 45, 660, 105, 16);
    context.fillStyle = "#991b1b";
    context.fill();

    const titleSize = fitTitle(context, card.name, 610);

    context.fillStyle = "#ffffff";
    context.font = `700 ${titleSize}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(card.name, CANVAS_WIDTH / 2, 98);

    // Artwork
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

    // Category
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = "#7f1d1d";
    context.font = "700 27px Arial, sans-serif";
    context.fillText(card.category ?? "Trading Card", 60, 715);

    // Description
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

    // Statistics
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

    return canvasToPng(canvas);
}

export async function renderBackToPng(
    card?: Card,
    layout?: Deck["layout"],
    artworkFiles: Map<string, File> = new Map(),
): Promise<Uint8Array> {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas rendering is not supported.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const backLayout = layout?.images.image_list.find((imageLayout) =>
        isBackImageSlot(imageLayout.name),
    );
    const backReference =
        card && backLayout
            ? findCardImage(card, backLayout.name)
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

    context.lineWidth = 12;
    context.strokeStyle = "#111827";
    context.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);

    return canvasToPng(canvas);
}
