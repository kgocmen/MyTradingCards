"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { DeckSchema } from "@/lib/deck-schema";
import type { Deck } from "@/lib/deck-schema";
import {
  getMissingLocalImages,
  safeFilename,
} from "@/lib/deck-utils";
import { storePdfPreviewDraft } from "@/lib/pdf-preview-store";
import sampleDeck from "../../public/samples/F1.json";

const SAMPLE_JSON = JSON.stringify(sampleDeck, null, 2);

export default function Home() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [artworkFiles, setArtworkFiles] = useState<
      Map<string, File>
  >(new Map());

  const [message, setMessage] = useState(
      "Add your JSON and card artwork.",
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpeningLayout, setIsOpeningLayout] = useState(false);

  async function loadJsonFile(
      event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setJsonText(await file.text());
    setMessage(`Loaded JSON file: ${file.name}`);
  }

  function loadArtworkFiles(
      event: ChangeEvent<HTMLInputElement>,
  ): void {
    const files = Array.from(event.target.files ?? []);
    const fileMap = new Map<string, File>();

    for (const file of files) {
      fileMap.set(file.name, file);
    }

    setArtworkFiles(fileMap);
    setMessage(`Loaded ${files.length} artwork file(s).`);
  }

  function parseDeckFromJson(): Deck {
    let unknownJson: unknown;

    try {
      unknownJson = JSON.parse(jsonText);
    } catch {
      throw new Error("The JSON text is not valid JSON.");
    }

    const result = DeckSchema.safeParse(unknownJson);

    if (!result.success) {
      const issues = result.error.issues
          .map((issue) => {
            const path = issue.path.join(".");
            return `${path || "JSON"}: ${issue.message}`;
          })
          .join("\n");

      throw new Error(issues);
    }

    return result.data;
  }

  function validateArtworkFiles(deck: Deck): void {
    const missingImages = getMissingLocalImages(deck, artworkFiles);

    if (missingImages.length > 0) {
      throw new Error(
          `Missing artwork files:\n${[
            ...new Set(missingImages),
          ].join("\n")}`,
      );
    }
  }

  function storeDeckDraft(deck: Deck): string {
    const filename = `${
        safeFilename(deck.deckName) || "trading-cards"
    }.pdf`;

    storePdfPreviewDraft({
        deck,
        filename,
        artworkFiles,
    });

    return filename;
  }

  async function editLayout(): Promise<void> {
    setIsOpeningLayout(true);

    try {
      const deck = parseDeckFromJson();

      storeDeckDraft(deck);
      setMessage(
          "Opening layout editor...",
      );
      router.push("/layout");
    } catch (error) {
      const text =
          error instanceof Error
              ? error.message
              : "An unexpected error occurred.";

      setMessage(text);
    } finally {
      setIsOpeningLayout(false);
    }
  }

  async function createPdf(): Promise<void> {
    setIsGenerating(true);

    try {
      const deck = parseDeckFromJson();

      validateArtworkFiles(deck);
      storeDeckDraft(deck);

      setMessage(
          `Prepared ${deck.cards.length} printable card(s). Opening preview...`,
      );

      router.push("/preview");
    } catch (error) {
      const text =
          error instanceof Error
              ? error.message
              : "An unexpected error occurred.";

      setMessage(text);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto max-w-5xl">
          <header className="mb-10">
            <p className="mb-2 font-semibold uppercase tracking-widest text-violet-400">
              MyTradingCards
            </p>

            <h1 className="text-4xl font-bold">
              Printable trading-card generator
            </h1>

            <p className="mt-3 max-w-2xl text-slate-300">
              Upload card data and artwork, then generate an
              A4 duplex-ready PDF.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-semibold">
                1. Card JSON
              </h2>

              <label className="mb-2 block text-sm text-slate-300">
                Upload a JSON file
              </label>

              <input
                  type="file"
                  accept="application/json,.json"
                  onChange={loadJsonFile}
                  className="mb-5 block w-full text-sm"
              />

              <label
                  htmlFor="json"
                  className="mb-2 block text-sm text-slate-300"
              >
                Or edit the JSON directly
              </label>

              <textarea
                  id="json"
                  value={jsonText}
                  onChange={(event) =>
                      setJsonText(event.target.value)
                  }
                  spellCheck={false}
                  className="h-[430px] w-full rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm outline-none focus:border-violet-500"
              />
            </section>

            <section className="space-y-6">
              <div className="rounded-2xl bg-slate-900 p-6">
                <h2 className="mb-4 text-xl font-semibold">
                  2. Card artwork
                </h2>

                <p className="mb-4 text-sm text-slate-300">
                  Upload all JPG or PNG files referenced by the
                  JSON.
                </p>

                <input
                    type="file"
                    accept="image/png,image/jpeg"
                    multiple
                    onChange={loadArtworkFiles}
                    className="block w-full text-sm"
                />

                <p className="mt-3 text-sm text-slate-400">
                  {artworkFiles.size} artwork file(s) selected
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-6">
                <h2 className="mb-4 text-xl font-semibold">
                  3. Edit layout
                </h2>

                <button
                    type="button"
                    onClick={editLayout}
                    disabled={isOpeningLayout}
                    className="w-full rounded-xl border border-slate-700 px-5 py-3 font-semibold transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isOpeningLayout
                      ? "Opening layout..."
                      : "Edit layout from JSON"}
                </button>
              </div>

              <div className="rounded-2xl bg-slate-900 p-6">
                <h2 className="mb-4 text-xl font-semibold">
                  4. Generate
                </h2>

                <button
                    type="button"
                    onClick={createPdf}
                    disabled={isGenerating}
                    className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating
                      ? "Generating PDF..."
                      : "Preview printable PDF"}
                </button>

                <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
                {message}
              </pre>
              </div>
            </section>
          </div>
        </div>
      </main>
  );
}
