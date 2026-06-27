# My Trading Cards

A small app for building printable trading-card decks from JSON or CSV data, previewing/editing cards, and exporting the result as a PDF.

## Development

```bash
npm run dev
```

Open http://localhost:3000 to use the app.

## Build

```bash
npm run build
```

## Publish on GitHub Pages

This repository includes a GitHub Actions workflow that builds the static site and deploys the `out` folder to GitHub Pages when changes are pushed to `main`.

In GitHub, open the repository settings and set:

- Pages source: `GitHub Actions`

After the workflow finishes, the site will be available at:

https://kgocmen.github.io/MyTradingCards/
