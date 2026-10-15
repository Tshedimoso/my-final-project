# Leaf & Lore — Book Discovery & Reading Tracker

A responsive book discovery app based on the W04 project proposal.

## Features
- Search books through Google Books and Open Library (two separate APIs).
- Search results include normalized JSON records with 8+ properties.
- Open a detail dialog and fetch a full Google Books volume record when available.
- Add books to a personal reading list and set status to Want to read, Currently reading, or Finished.
- Reading list persists in `localStorage`.
- Filter and sort search results and saved books.
- Loading, empty, partial API failure, and error states.
- Responsive layout, animations, transitions, hover states, and reduced-motion support.

## Run locally
1. Install a current Node.js LTS version.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local URL printed by Vite.

## Build
Run `npm run build`, then `npm run preview` to test the production build.

## Main files
- `index.html`: page structure
- `src/js/main.js`: state, rendering coordination, and event handlers
- `src/js/api.js`: API requests and JSON normalization
- `src/js/display.js`: book cards and detail dialog templates
- `src/js/utils.js`: text helpers, localStorage, dates, and toast messages
- `src/css/style.css`: visual design and responsive styling

## Notes
- The app uses public endpoints and does not require an API key for its basic search flow, but API availability and rate limits are controlled by the providers.
- Verify all interactions and citations against the course rubric before submission.
- For GitHub Pages deployment, configure the correct Vite `base` path for the repository, or deploy to a static host that supports Vite builds.
