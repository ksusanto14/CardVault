# CardVault

A web app for tracking a trading card collection (sports cards, Pokémon, Magic, and more) and what it's worth.

**Features**

- Add, edit, and delete cards: name, category, set, year, card number, condition, grading (PSA/BGS/SGC/CGC), quantity, purchase price, current value, notes.
- Search, filter by category, condition, or graded/raw, and sort.
- Stats: total cards, collection value, gain/loss, most valuable card.
- Export the collection to Excel (.xlsx), with totals.

No database or account is needed. Cards are saved in the browser's local storage, so each visitor has their own collection on their own device. Clearing browser data erases it, so use **Export to Excel** to keep a backup.

Built with Next.js 16, React 19, Tailwind CSS v4, and ExcelJS.

## Run locally

Requires [Node.js](https://nodejs.org) (LTS).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, click **Add New → Project**, import the repo, and click **Deploy**. No settings or environment variables are needed.

## Project structure

```
src/
  app/page.tsx             Page layout
  components/
    CardVault.tsx          Stats, search/filters, card table
    CardForm.tsx           Add/edit card modal
  lib/
    cards.ts               Card type, dropdown options, form validation
    store.ts               Saves/loads cards in localStorage
    exportExcel.ts         Builds and downloads the .xlsx file
```
