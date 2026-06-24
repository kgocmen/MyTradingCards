import { z } from "zod";

export const StatSchema = z.object({
    label: z.string().min(1),
    value: z.union([z.string(), z.number()]),
});

export const CardSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    image: z.string().min(1),
    category: z.string().optional(),
    description: z.string().optional(),
    stats: z.array(StatSchema).min(1).max(8),
});

export const DeckSchema = z.object({
    deckName: z.string().min(1),
    cards: z.array(CardSchema).min(1).max(100),
});

export type Card = z.infer<typeof CardSchema>;
export type Deck = z.infer<typeof DeckSchema>;