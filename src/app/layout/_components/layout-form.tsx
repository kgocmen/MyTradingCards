"use client";

import { BoxEditor } from "@/app/layout/_components/box-editor";
import type { Deck } from "@/lib/deck-schema";

type DeckLayout = NonNullable<Deck["layout"]>;
type ImageLayout = DeckLayout["images"]["image_list"][number];
type StatLayout = DeckLayout["information"]["stats"][number];

export function LayoutForm({
    layout,
    message,
    onChangeLayout,
    onChangeImageLayout,
    onChangeStatLayout,
    onMoveImageLayout,
}: {
    layout: DeckLayout;
    message: string;
    onChangeLayout: (layout: DeckLayout) => void;
    onChangeImageLayout: (
        index: number,
        imageLayout: ImageLayout,
    ) => void;
    onChangeStatLayout: (
        index: number,
        statLayout: StatLayout,
    ) => void;
    onMoveImageLayout: (index: number, direction: -1 | 1) => void;
}) {
    return (
        <section className="space-y-4 rounded-xl bg-slate-900 p-5 lg:max-h-full lg:overflow-y-auto">
            <BoxEditor
                title="Title"
                box={layout.title}
                styleControls={[
                    "fontFamily",
                    "backgroundColor",
                    "textColor",
                ]}
                onChange={(box) =>
                    onChangeLayout({
                        ...layout,
                        title: box,
                    })
                }
            />

            <BoxEditor
                title="Information"
                box={layout.information}
                styleControls={["backgroundColor"]}
                onChange={(box) =>
                    onChangeLayout({
                        ...layout,
                        information: {
                            ...layout.information,
                            ...box,
                        },
                    })
                }
            />

            <BoxEditor
                title="Description"
                box={layout.information.description}
                styleControls={[
                    "fontFamily",
                    "backgroundColor",
                    "textColor",
                ]}
                onChange={(box) =>
                    onChangeLayout({
                        ...layout,
                        information: {
                            ...layout.information,
                            description: box,
                        },
                    })
                }
            />

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-300">
                    Images
                </h2>

                {layout.images.image_list.map((imageLayout, index) => (
                    <BoxEditor
                        key={`${imageLayout.name}-${index}`}
                        title={imageLayout.name}
                        box={imageLayout}
                        styleControls={
                            imageLayout.name.toLowerCase() === "back"
                                ? []
                                : ["borderColor"]
                        }
                        onChange={(box) =>
                            onChangeImageLayout(index, {
                                ...imageLayout,
                                ...box,
                            })
                        }
                    >
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    onMoveImageLayout(index, -1)
                                }
                                disabled={index === 0}
                                className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Up
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    onMoveImageLayout(index, 1)
                                }
                                disabled={
                                    index ===
                                    layout.images.image_list.length - 1
                                }
                                className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Down
                            </button>
                        </div>
                    </BoxEditor>
                ))}
            </div>

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-300">
                    Stats
                </h2>

                {layout.information.stats.map((statLayout, index) => (
                    <BoxEditor
                        key={`${statLayout.label}-${index}`}
                        title={statLayout.label}
                        box={statLayout}
                        styleControls={[
                            "fontFamily",
                            "backgroundColor",
                            "textColor",
                            "accentColor",
                        ]}
                        onChange={(box) =>
                            onChangeStatLayout(index, {
                                ...statLayout,
                                ...box,
                            })
                        }
                    />
                ))}
            </div>

            {message ? (
                <p className="rounded-lg bg-slate-950 p-3 text-sm text-slate-300">
                    {message}
                </p>
            ) : null}
        </section>
    );
}
