import type { LayoutBox } from "@/lib/deck-schema";
import { isRemoteUrl } from "@/lib/deck-utils";

export const CANVAS_WIDTH = 750;
export const CANVAS_HEIGHT = 1050;

export type ImageSource = File | string;

export type RenderBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export function loadImage(
    source: ImageSource,
): Promise<HTMLImageElement> {
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

        if (typeof source === "string" && isRemoteUrl(source)) {
            image.crossOrigin = "anonymous";
        }

        image.src = url;
    });
}

export function roundedRectangle(
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

export function drawImageCover(
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

export function boxToPixels(box: LayoutBox): RenderBox {
    const [left, bottom] = box["bottom-left"];
    const [right, top] = box["top-right"];

    return {
        x: left * CANVAS_WIDTH,
        y: (1 - top) * CANVAS_HEIGHT,
        width: (right - left) * CANVAS_WIDTH,
        height: (top - bottom) * CANVAS_HEIGHT,
    };
}

export function fitTitle(
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

export function drawWrappedText(
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

export function drawPlaceholder(
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

export function drawBoxBorder(
    context: CanvasRenderingContext2D,
    box: RenderBox,
    color = "#111827",
    lineWidth = 3,
): void {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.strokeRect(box.x, box.y, box.width, box.height);
}

export function drawStatRow(
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

export function canvasToPng(
    canvas: HTMLCanvasElement,
): Promise<Uint8Array> {
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
