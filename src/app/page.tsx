"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";

import { DeckSchema } from "@/lib/deck-schema";
import { generateDeckPdf } from "@/lib/pdf-generator";

const SAMPLE_JSON = `{
  "deckName": "My Heroes",
  "cards": [
    {
      "id": "fire-hero",
      "name": "Fire Hero",
      "image": "fire-hero.jpg",
      "category": "Elemental Hero",
      "description": "Controls fire and withstands extreme temperatures.",
      "stats": [
        { "label": "Strength", "value": 86 },
        { "label": "Speed", "value": 72 },
        { "label": "Intelligence", "value": 65 },
        { "label": "Power", "value": 91 }
      ]
    }
  ]
}`;

function safeFilename(value: string): string {
  return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "");
}

export default function Home() {
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [artworkFiles, setArtworkFiles] = useState<
      Map<string, File>
  >(new Map());

  const [backFile, setBackFile] = useState<File | null>(
      null,
  );

  const [message, setMessage] = useState(
      "Add your JSON, card artwork, and back image.",
  );

  const [isGenerating, setIsGenerating] = useState(false);

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

  function loadBackFile(
      event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.target.files?.[0] ?? null;
    setBackFile(file);

    if (file) {
      setMessage(`Loaded back image: ${file.name}`);
    }
  }

  async function createPdf(): Promise<void> {
    setIsGenerating(true);

    try {
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

      if (!backFile) {
        throw new Error("Select a card-back image.");
      }

      const missingImages = result.data.cards
          .map((card) => card.image)
          .filter((filename) => !artworkFiles.has(filename));

      if (missingImages.length > 0) {
        throw new Error(
            `Missing artwork files:\n${[
              ...new Set(missingImages),
            ].join("\n")}`,
        );
      }

      setMessage("Rendering cards and generating PDF...");

      const pdfBuffer = await generateDeckPdf(
          result.data,
          artworkFiles,
          backFile,
      );

      const blob = new Blob([pdfBuffer], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${
          safeFilename(result.data.deckName) || "trading-cards"
      }.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      setMessage(
          `Created ${result.data.cards.length} printable card(s).`,
      );
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
                  3. Card back
                </h2>

                <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={loadBackFile}
                    className="block w-full text-sm"
                />

                <p className="mt-3 text-sm text-slate-400">
                  {backFile
                      ? backFile.name
                      : "No back image selected"}
                </p>
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
                      : "Generate printable PDF"}
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