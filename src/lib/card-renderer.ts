import type { Card } from "@/lib/deck-schema";

const CANVAS_WIDTH = 750;
const CANVAS_HEIGHT = 1050;

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Could not load image: ${file.name}`));
        };

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

function fitTitle(
    context: CanvasRenderingContext2D,
    text: string,
    maximumWidth: number,
): number {
    let size = 50;

    while (size > 25) {
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
    artworkFile: File,
): Promise<Uint8Array> {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas rendering is not supported.");
    }

    const artwork = await loadImage(artworkFile);

    // Main background
    const background = context.createLinearGradient(
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
    );

    background.addColorStop(0, "#32165c");
    background.addColorStop(1, "#111827");

    context.fillStyle = background;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Outer card area
    roundedRectangle(context, 25, 25, 700, 1000, 25);
    context.fillStyle = "#f8fafc";
    context.fill();

    context.lineWidth = 10;
    context.strokeStyle = "#4c1d95";
    context.stroke();

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
    drawImageCover(context, artwork, 55, 170, 640, 500);
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
    backFile: File,
): Promise<Uint8Array> {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas rendering is not supported.");
    }

    const image = await loadImage(backFile);

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawImageCover(
        context,
        image,
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
    );

    context.lineWidth = 12;
    context.strokeStyle = "#111827";
    context.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);

    return canvasToPng(canvas);
}