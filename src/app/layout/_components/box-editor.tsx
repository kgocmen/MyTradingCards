"use client";

import type { ReactNode } from "react";

import type {
    LayoutBox,
    LayoutStyle,
} from "@/lib/deck-schema";
import { FONT_OPTIONS } from "@/lib/layout-style";

type CornerName = "bottom-left" | "top-right";
type StyleControl =
    | "fontFamily"
    | "backgroundColor"
    | "alternateBackgroundColor"
    | "textColor"
    | "accentColor"
    | "borderColor";

const STYLE_LABELS: Record<StyleControl, string> = {
    fontFamily: "Font",
    backgroundColor: "Background",
    alternateBackgroundColor: "Alt background",
    textColor: "Text",
    accentColor: "Accent",
    borderColor: "Border",
};

const STYLE_DEFAULTS: Record<Exclude<StyleControl, "fontFamily">, string> = {
    backgroundColor: "#ffffff",
    alternateBackgroundColor: "#f8fafc",
    textColor: "#111827",
    accentColor: "#991b1b",
    borderColor: "#111827",
};

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(1, Math.max(0, value));
}

function updateBoxCoordinate(
    box: LayoutBox,
    corner: CornerName,
    axis: 0 | 1,
    value: string,
): LayoutBox {
    const nextCoordinate: [number, number] = [...box[corner]];

    nextCoordinate[axis] = clampUnit(Number(value));

    return {
        ...box,
        [corner]: nextCoordinate,
    };
}

function updateBoxStyle(
    box: LayoutBox,
    key: keyof LayoutStyle,
    value: string,
): LayoutBox {
    const nextStyle = {
        ...(box.style ?? {}),
        [key]: value,
    };

    return {
        ...box,
        style: nextStyle,
    };
}

function CoordinateInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: string) => void;
}) {
    return (
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>{label}</span>
            <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm font-normal normal-case tracking-normal text-slate-100 outline-none focus:border-violet-500"
            />
        </label>
    );
}

export function BoxEditor({
    title,
    box,
    styleControls = [],
    onChange,
    children,
}: {
    title: string;
    box: LayoutBox;
    styleControls?: StyleControl[];
    onChange: (box: LayoutBox) => void;
    children?: ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-200">
                    {title}
                </h2>
                {children}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <CoordinateInput
                    label="Left"
                    value={box["bottom-left"][0]}
                    onChange={(value) =>
                        onChange(
                            updateBoxCoordinate(
                                box,
                                "bottom-left",
                                0,
                                value,
                            ),
                        )
                    }
                />

                <CoordinateInput
                    label="Bottom"
                    value={box["bottom-left"][1]}
                    onChange={(value) =>
                        onChange(
                            updateBoxCoordinate(
                                box,
                                "bottom-left",
                                1,
                                value,
                            ),
                        )
                    }
                />

                <CoordinateInput
                    label="Right"
                    value={box["top-right"][0]}
                    onChange={(value) =>
                        onChange(
                            updateBoxCoordinate(
                                box,
                                "top-right",
                                0,
                                value,
                            ),
                        )
                    }
                />

                <CoordinateInput
                    label="Top"
                    value={box["top-right"][1]}
                    onChange={(value) =>
                        onChange(
                            updateBoxCoordinate(
                                box,
                                "top-right",
                                1,
                                value,
                            ),
                        )
                    }
                />
            </div>

            {styleControls.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                    {styleControls.map((control) => {
                        if (control === "fontFamily") {
                            return (
                                <label
                                    key={control}
                                    className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400"
                                >
                                    <span>{STYLE_LABELS[control]}</span>
                                    <select
                                        value={
                                            box.style?.fontFamily ??
                                            FONT_OPTIONS[0].value
                                        }
                                        onChange={(event) =>
                                            onChange(
                                                updateBoxStyle(
                                                    box,
                                                    control,
                                                    event.target.value,
                                                ),
                                            )
                                        }
                                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm font-normal normal-case tracking-normal text-slate-100 outline-none focus:border-violet-500"
                                    >
                                        {FONT_OPTIONS.map((font) => (
                                            <option
                                                key={font.value}
                                                value={font.value}
                                            >
                                                {font.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            );
                        }

                        return (
                            <label
                                key={control}
                                className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400"
                            >
                                <span>{STYLE_LABELS[control]}</span>
                                <input
                                    type="color"
                                    value={
                                        box.style?.[control] ??
                                        STYLE_DEFAULTS[control]
                                    }
                                    onChange={(event) =>
                                        onChange(
                                            updateBoxStyle(
                                                box,
                                                control,
                                                event.target.value,
                                            ),
                                        )
                                    }
                                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 outline-none focus:border-violet-500"
                                />
                            </label>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
