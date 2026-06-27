import type { LayoutStyle } from "@/lib/deck-schema";

export const DEFAULT_FONT_FAMILY = "Arial, sans-serif";

export const FONT_OPTIONS = [
    {
        label: "Arial",
        value: "Arial, sans-serif",
    },
    {
        label: "Trebuchet",
        value: "Trebuchet MS, sans-serif",
    },
    {
        label: "Georgia",
        value: "Georgia, serif",
    },
    {
        label: "Courier",
        value: "Courier New, monospace",
    },
    {
        label: "Impact",
        value: "Impact, sans-serif",
    },
];

export function styleColor(
    style: LayoutStyle | undefined,
    key: keyof Pick<
        LayoutStyle,
        | "backgroundColor"
        | "alternateBackgroundColor"
        | "textColor"
        | "accentColor"
        | "borderColor"
    >,
    fallback: string,
): string {
    return style?.[key] ?? fallback;
}

export function styleFontFamily(
    style: LayoutStyle | undefined,
): string {
    return style?.fontFamily ?? DEFAULT_FONT_FAMILY;
}

export function canvasFont(
    weight: number,
    size: number,
    style: LayoutStyle | undefined,
): string {
    return `${weight} ${size}px ${styleFontFamily(style)}`;
}
