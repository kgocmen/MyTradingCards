import { z } from "zod";

const CoordinateSchema = z.tuple([
    z.number().min(0).max(1),
    z.number().min(0).max(1),
]);

const LayoutBoxSchema = z.object({
    "bottom-left": CoordinateSchema,
    "top-right": CoordinateSchema,
});

const ImageLayoutSchema = LayoutBoxSchema.extend({
    name: z.string().min(1),
    shape: z.string().optional(),
});

export const LayoutSchema = z.object({
    title: LayoutBoxSchema,
    images: LayoutBoxSchema.extend({
        image_list: z.array(ImageLayoutSchema).min(1),
    }),
    information: LayoutBoxSchema.extend({
        description: LayoutBoxSchema,
        stats: z.array(
            LayoutBoxSchema.extend({
                label: z.string().min(1),
            }),
        ).min(1),
    }),
});

export const StatSchema = z.object({
    label: z.string().min(1),
    value: z.union([z.string(), z.number()]),
});

export const CardSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    image: z.string().min(1).optional(),
    images: z.record(z.string().min(1), z.string().min(1)).optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    stats: z.array(StatSchema).min(1).max(8),
});

export const DeckSchema = z.object({
    deckName: z.string().min(1),
    layout: LayoutSchema.optional(),
    cards: z.array(CardSchema).min(1).max(100),
});

export type Card = z.infer<typeof CardSchema>;
export type Deck = z.infer<typeof DeckSchema>;
export type LayoutBox = z.infer<typeof LayoutBoxSchema>;
