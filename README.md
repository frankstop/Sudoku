# Sudoku

A polished, static Sudoku web game built with plain HTML, CSS, and JavaScript.

Play it here: https://frankstop.github.io/Sudoku/

## Overview

Sudoku is a browser-based puzzle game with a clean board, large touch targets, keyboard support, and a calm visual style designed for desktop and phone screens.

The app runs without a backend, build step, paid service, or framework. It can be hosted directly from GitHub Pages.

## Features

- Playable Sudoku puzzles with Easy, Medium, Hard, and Expert difficulty levels
- Locked givens with a distinct visual style
- Editable cells for player entries
- Mouse, touch, and keyboard input
- On-screen number pad
- Notes mode for pencil marks
- Hint, erase, reset, undo, and redo controls
- Timer and progress display
- Mistake checking with inline highlights
- Selected cell, matching number, row, column, and box highlights
- Completed-number handling in the number pad
- Polished completion dialog with time and difficulty
- Responsive layout for desktop, tablet, and phone screens

## Local Setup

Open `index.html` directly in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Project Structure

```text
.
├── index.html
├── styles.css
├── script.js
├── README.md
└── RELEASE_NOTES.md
```

## Deployment

This project is ready for GitHub Pages. The live site is served from the `main` branch root:

```text
https://frankstop.github.io/Sudoku/
```

## Tech Notes

- No backend
- No bundler
- No package install required
- Plain HTML, CSS, and JavaScript
- Google Analytics tag included in `index.html`
