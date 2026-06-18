const DIFFICULTY_SETTINGS = {
  easy: { givens: 42, hints: 4 },
  medium: { givens: 36, hints: 3 },
  hard: { givens: 30, hints: 3 },
  expert: { givens: 24, hints: 2 },
};

const SAVE_KEY = "sudoku.activeSave.v1";
const PREFS_KEY = "sudoku.preferences.v1";

const state = {
  difficulty: "medium",
  puzzle: [],
  solution: [],
  values: [],
  notes: [],
  locked: [],
  selected: null,
  notesMode: false,
  mistakeChecking: true,
  undoStack: [],
  redoStack: [],
  hintsLeft: 3,
  seconds: 0,
  timerId: null,
  completed: false,
  screen: "title",
};

const titleScreen = document.querySelector("#titleScreen");
const gameScreen = document.querySelector("#gameScreen");
const boardEl = document.querySelector("#board");
const numberPadEl = document.querySelector("#numberPad");
const difficultySelect = document.querySelector("#difficultySelect");
const timerEl = document.querySelector("#timer");
const progressValue = document.querySelector("#progressValue");
const notesButton = document.querySelector("#notesButton");
const undoButton = document.querySelector("#undoButton");
const redoButton = document.querySelector("#redoButton");
const hintButton = document.querySelector("#hintButton");
const hintCount = document.querySelector("#hintCount");
const eraseButton = document.querySelector("#eraseButton");
const resetButton = document.querySelector("#resetButton");
const newGameButton = document.querySelector("#newGameButton");
const resumeButton = document.querySelector("#resumeButton");
const loadSaveButton = document.querySelector("#loadSaveButton");
const saveNote = document.querySelector("#saveNote");
const mistakeToggle = document.querySelector("#mistakeToggle");
const settingsModal = document.querySelector("#settingsModal");
const settingsSummary = document.querySelector("#settingsSummary");
const titleSettingsButton = document.querySelector("#titleSettingsButton");
const gameSettingsButton = document.querySelector("#gameSettingsButton");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const returnMenuButton = document.querySelector("#returnMenuButton");
const completionModal = document.querySelector("#completionModal");
const completeMessage = document.querySelector("#completeMessage");
const playAgainButton = document.querySelector("#playAgainButton");
const completeMenuButton = document.querySelector("#completeMenuButton");

function range(count) {
  return Array.from({ length: count }, (_, index) => index);
}

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function pattern(row, col) {
  return (row * 3 + Math.floor(row / 3) + col) % 9;
}

function makeSolvedGrid() {
  const rows = shuffle([0, 1, 2]).flatMap((band) => shuffle([0, 1, 2]).map((row) => band * 3 + row));
  const cols = shuffle([0, 1, 2]).flatMap((stack) => shuffle([0, 1, 2]).map((col) => stack * 3 + col));
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return rows.map((row) => cols.map((col) => nums[pattern(row, col)]));
}

function makePuzzle(solution, difficulty) {
  const givens = DIFFICULTY_SETTINGS[difficulty].givens;
  const puzzle = solution.map((row) => [...row]);
  const cellsToRemove = shuffle(range(81)).slice(0, 81 - givens);
  cellsToRemove.forEach((index) => {
    puzzle[Math.floor(index / 9)][index % 9] = 0;
  });
  return puzzle;
}

function readJSON(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or storage limits should not block gameplay.
  }
}

function removeSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage errors.
  }
  updateSaveButtons();
}

function isGrid(grid) {
  return Array.isArray(grid) && grid.length === 9 && grid.every((row) => Array.isArray(row) && row.length === 9);
}

function getSavedGame() {
  const saved = readJSON(SAVE_KEY);
  if (!saved || !isGrid(saved.puzzle) || !isGrid(saved.solution) || !isGrid(saved.values)) return null;
  if (!DIFFICULTY_SETTINGS[saved.difficulty]) return null;
  return saved;
}

function savePreferences() {
  writeJSON(PREFS_KEY, {
    difficulty: state.difficulty,
    mistakeChecking: state.mistakeChecking,
  });
}

function loadPreferences() {
  const prefs = readJSON(PREFS_KEY);
  if (!prefs) return;
  if (DIFFICULTY_SETTINGS[prefs.difficulty]) state.difficulty = prefs.difficulty;
  if (typeof prefs.mistakeChecking === "boolean") state.mistakeChecking = prefs.mistakeChecking;
}

function gameSnapshot() {
  return {
    difficulty: state.difficulty,
    puzzle: state.puzzle,
    solution: state.solution,
    values: state.values,
    notes: state.notes,
    locked: state.locked,
    selected: state.selected,
    notesMode: state.notesMode,
    mistakeChecking: state.mistakeChecking,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    hintsLeft: state.hintsLeft,
    seconds: state.seconds,
    completed: state.completed,
    savedAt: Date.now(),
  };
}

function saveGame() {
  savePreferences();
  if (!state.puzzle.length || state.completed) return;
  writeJSON(SAVE_KEY, gameSnapshot());
  updateSaveButtons();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function updateSaveButtons() {
  const saved = getSavedGame();
  const hasSave = Boolean(saved);
  resumeButton.disabled = !hasSave;
  loadSaveButton.disabled = !hasSave;
  resumeButton.setAttribute("aria-disabled", String(!hasSave));
  loadSaveButton.setAttribute("aria-disabled", String(!hasSave));
  saveNote.textContent = hasSave
    ? `Saved ${titleCase(saved.difficulty)} game at ${formatTime(saved.seconds || 0)}.`
    : "No saved puzzle yet.";
}

function showTitle() {
  state.screen = "title";
  clearInterval(state.timerId);
  titleScreen.hidden = false;
  gameScreen.hidden = true;
  settingsModal.hidden = true;
  completionModal.hidden = true;
  difficultySelect.value = state.difficulty;
  mistakeToggle.checked = state.mistakeChecking;
  updateSaveButtons();
}

function showGame() {
  state.screen = "game";
  titleScreen.hidden = true;
  gameScreen.hidden = false;
  settingsModal.hidden = true;
  renderTimer();
  render();
  startTimer();
}

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = window.setInterval(() => {
    if (!state.completed && state.screen === "game") {
      state.seconds += 1;
      renderTimer();
      saveGame();
    }
  }, 1000);
}

function renderTimer() {
  timerEl.textContent = formatTime(state.seconds);
}

function snapshot() {
  return {
    values: state.values.map((row) => [...row]),
    notes: state.notes.map((row) => row.map((cell) => [...cell])),
    hintsLeft: state.hintsLeft,
  };
}

function restore(snapshotValue) {
  state.values = snapshotValue.values.map((row) => [...row]);
  state.notes = snapshotValue.notes.map((row) => row.map((cell) => [...cell]));
  state.hintsLeft = snapshotValue.hintsLeft;
  render();
  saveGame();
}

function pushUndo() {
  state.undoStack.push(snapshot());
  state.redoStack = [];
  updateHistoryButtons();
}

function updateHistoryButtons() {
  undoButton.disabled = state.undoStack.length === 0;
  redoButton.disabled = state.redoStack.length === 0;
}

function sameBox(a, b) {
  return Math.floor(a.row / 3) === Math.floor(b.row / 3) && Math.floor(a.col / 3) === Math.floor(b.col / 3);
}

function hasConflict(row, col, value) {
  if (!value) return false;
  for (let i = 0; i < 9; i += 1) {
    if (i !== col && state.values[row][i] === value) return true;
    if (i !== row && state.values[i][col] === value) return true;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if ((r !== row || c !== col) && state.values[r][c] === value) return true;
    }
  }
  return false;
}

function isNumberComplete(number) {
  let placed = 0;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (state.values[row][col] === number) {
        placed += 1;
        if (state.solution[row][col] !== number || hasConflict(row, col, number)) return false;
      }
    }
  }
  return placed === 9;
}

function isWrongAgainstSolution(row, col) {
  const value = state.values[row][col];
  return Boolean(value && value !== state.solution[row][col]);
}

function cellLabel(row, col) {
  const value = state.values[row][col];
  if (value) return `Row ${row + 1}, column ${col + 1}, ${value}`;
  return `Row ${row + 1}, column ${col + 1}, empty`;
}

function renderBoard() {
  boardEl.innerHTML = "";
  const selected = state.selected;
  const selectedValue = selected ? state.values[selected.row][selected.col] : 0;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = state.values[row][col];
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", cellLabel(row, col));

      if (state.locked[row][col]) cell.classList.add("given");
      if (selected) {
        if (selected.row === row && selected.col === col) cell.classList.add("selected");
        else if (sameBox(selected, { row, col })) cell.classList.add("box-related");
        if (selected.row === row || selected.col === col) cell.classList.add("related");
      }
      if (selectedValue && value === selectedValue) cell.classList.add("matching");
      if (state.mistakeChecking && value && (hasConflict(row, col, value) || isWrongAgainstSolution(row, col))) {
        cell.classList.add("error");
      }

      if (value) {
        cell.textContent = value;
      } else {
        const noteValues = state.notes[row][col] || [];
        if (noteValues.length) {
          const notes = document.createElement("span");
          notes.className = "notes";
          for (let n = 1; n <= 9; n += 1) {
            const mark = document.createElement("span");
            mark.textContent = noteValues.includes(n) ? n : "";
            notes.appendChild(mark);
          }
          cell.appendChild(notes);
        }
      }

      cell.addEventListener("click", () => selectCell(row, col));
      boardEl.appendChild(cell);
    }
  }
}

function renderPad() {
  numberPadEl.innerHTML = "";
  const selectedValue = state.selected ? state.values[state.selected.row][state.selected.col] : 0;
  for (let n = 1; n <= 9; n += 1) {
    const complete = isNumberComplete(n);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "number-button";
    button.textContent = n;
    button.setAttribute("aria-label", complete ? `${n} complete` : `Enter ${n}`);
    if (selectedValue === n) button.classList.add("active");
    if (complete) {
      button.classList.add("complete");
      button.disabled = true;
    }
    button.addEventListener("click", () => enterNumber(n));
    numberPadEl.appendChild(button);
  }
}

function renderProgress() {
  const filled = state.values.flat().filter(Boolean).length;
  progressValue.textContent = `${Math.round((filled / 81) * 100)}%`;
}

function renderControls() {
  notesButton.setAttribute("aria-pressed", String(state.notesMode));
  notesButton.querySelector("small").textContent = state.notesMode ? "On" : "Off";
  mistakeToggle.checked = state.mistakeChecking;
  hintCount.textContent = state.hintsLeft;
  hintButton.disabled = state.hintsLeft === 0 || state.completed || state.screen !== "game";
  updateHistoryButtons();
}

function render() {
  if (!state.puzzle.length) return;
  renderBoard();
  renderPad();
  renderProgress();
  renderControls();
}

function selectCell(row, col) {
  state.selected = { row, col };
  render();
  saveGame();
}

function clearNotesWithNumber(row, col, number) {
  for (let c = 0; c < 9; c += 1) {
    state.notes[row][c] = state.notes[row][c].filter((note) => note !== number);
  }
  for (let r = 0; r < 9; r += 1) {
    state.notes[r][col] = state.notes[r][col].filter((note) => note !== number);
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      state.notes[r][c] = state.notes[r][c].filter((note) => note !== number);
    }
  }
}

function enterNumber(number) {
  if (!state.selected || state.completed || state.screen !== "game") return;
  if (isNumberComplete(number)) return;
  const { row, col } = state.selected;
  if (state.locked[row][col]) return;

  pushUndo();
  if (state.notesMode) {
    if (state.values[row][col]) state.values[row][col] = 0;
    const notes = state.notes[row][col];
    state.notes[row][col] = notes.includes(number) ? notes.filter((note) => note !== number) : [...notes, number].sort();
  } else {
    state.values[row][col] = number;
    state.notes[row][col] = [];
    clearNotesWithNumber(row, col, number);
  }
  render();
  saveGame();
  validateCompletion();
}

function eraseSelected() {
  if (!state.selected || state.completed || state.screen !== "game") return;
  const { row, col } = state.selected;
  if (state.locked[row][col]) return;
  if (!state.values[row][col] && !state.notes[row][col].length) return;
  pushUndo();
  state.values[row][col] = 0;
  state.notes[row][col] = [];
  render();
  saveGame();
}

function undo() {
  if (!state.undoStack.length) return;
  state.redoStack.push(snapshot());
  restore(state.undoStack.pop());
}

function redo() {
  if (!state.redoStack.length) return;
  state.undoStack.push(snapshot());
  restore(state.redoStack.pop());
}

function giveHint() {
  if (state.screen !== "game" || state.completed || state.hintsLeft <= 0) return;
  const selected = state.selected;
  let target = selected && !state.locked[selected.row][selected.col] && state.values[selected.row][selected.col] !== state.solution[selected.row][selected.col]
    ? selected
    : null;

  if (!target) {
    const candidates = range(81)
      .map((index) => ({ row: Math.floor(index / 9), col: index % 9 }))
      .filter(({ row, col }) => !state.locked[row][col] && state.values[row][col] !== state.solution[row][col]);
    target = shuffle(candidates)[0];
  }
  if (!target) return;

  pushUndo();
  state.values[target.row][target.col] = state.solution[target.row][target.col];
  state.notes[target.row][target.col] = [];
  state.hintsLeft -= 1;
  state.selected = target;
  clearNotesWithNumber(target.row, target.col, state.values[target.row][target.col]);
  render();
  saveGame();
  validateCompletion();
}

function resetPuzzle() {
  if (!state.puzzle.length) return;
  pushUndo();
  state.values = state.puzzle.map((row) => [...row]);
  state.notes = range(9).map(() => range(9).map(() => []));
  state.completed = false;
  completionModal.hidden = true;
  render();
  saveGame();
}

function validateCompletion() {
  const filled = state.values.every((row) => row.every(Boolean));
  if (!filled) return false;

  const solved = state.values.every((row, r) => row.every((value, c) => value === state.solution[r][c]));
  if (!solved) {
    render();
    saveGame();
    return false;
  }

  state.completed = true;
  clearInterval(state.timerId);
  removeSave();
  render();
  completeMessage.textContent = `${titleCase(state.difficulty)} solved in ${formatTime(state.seconds)}.`;
  completionModal.hidden = false;
  return true;
}

function normalizeLoadedGame(saved) {
  state.difficulty = saved.difficulty;
  state.solution = saved.solution.map((row) => [...row]);
  state.puzzle = saved.puzzle.map((row) => [...row]);
  state.values = saved.values.map((row) => [...row]);
  state.locked = isGrid(saved.locked) ? saved.locked.map((row) => row.map(Boolean)) : state.puzzle.map((row) => row.map(Boolean));
  state.notes = Array.isArray(saved.notes) && saved.notes.length === 9 && saved.notes.every((row) => Array.isArray(row) && row.length === 9)
    ? saved.notes.map((row) => row.map((cell) => Array.isArray(cell) ? cell.filter((n) => n >= 1 && n <= 9) : []))
    : range(9).map(() => range(9).map(() => []));
  state.selected = saved.selected && Number.isInteger(saved.selected.row) && Number.isInteger(saved.selected.col) ? saved.selected : null;
  state.notesMode = Boolean(saved.notesMode);
  state.mistakeChecking = typeof saved.mistakeChecking === "boolean" ? saved.mistakeChecking : state.mistakeChecking;
  state.undoStack = Array.isArray(saved.undoStack) ? saved.undoStack : [];
  state.redoStack = Array.isArray(saved.redoStack) ? saved.redoStack : [];
  state.hintsLeft = Number.isInteger(saved.hintsLeft) ? saved.hintsLeft : DIFFICULTY_SETTINGS[state.difficulty].hints;
  state.seconds = Number.isInteger(saved.seconds) ? saved.seconds : 0;
  state.completed = Boolean(saved.completed);
  difficultySelect.value = state.difficulty;
}

function newGame(difficulty = state.difficulty) {
  const solution = makeSolvedGrid();
  const puzzle = makePuzzle(solution, difficulty);
  state.difficulty = difficulty;
  state.solution = solution;
  state.puzzle = puzzle;
  state.values = puzzle.map((row) => [...row]);
  state.locked = puzzle.map((row) => row.map(Boolean));
  state.notes = range(9).map(() => range(9).map(() => []));
  state.selected = null;
  state.notesMode = false;
  state.undoStack = [];
  state.redoStack = [];
  state.hintsLeft = DIFFICULTY_SETTINGS[difficulty].hints;
  state.seconds = 0;
  state.completed = false;
  difficultySelect.value = difficulty;
  completionModal.hidden = true;
  saveGame();
  showGame();
}

function loadSavedGame() {
  const saved = getSavedGame();
  if (!saved) {
    updateSaveButtons();
    return;
  }
  normalizeLoadedGame(saved);
  showGame();
}

function openSettings() {
  const inGame = state.screen === "game" && state.puzzle.length;
  settingsModal.dataset.context = inGame ? "game" : "title";
  settingsSummary.textContent = inGame ? "Puzzle options and game actions." : "Default options for your next puzzle.";
  mistakeToggle.checked = state.mistakeChecking;
  renderProgress();
  renderControls();
  settingsModal.hidden = false;
}

function closeSettings() {
  settingsModal.hidden = true;
}

difficultySelect.addEventListener("change", (event) => {
  state.difficulty = event.target.value;
  savePreferences();
});

newGameButton.addEventListener("click", () => newGame(difficultySelect.value));
resumeButton.addEventListener("click", loadSavedGame);
loadSaveButton.addEventListener("click", loadSavedGame);
playAgainButton.addEventListener("click", () => newGame(state.difficulty));
completeMenuButton.addEventListener("click", showTitle);
titleSettingsButton.addEventListener("click", openSettings);
gameSettingsButton.addEventListener("click", openSettings);
closeSettingsButton.addEventListener("click", closeSettings);
returnMenuButton.addEventListener("click", showTitle);

notesButton.addEventListener("click", () => {
  state.notesMode = !state.notesMode;
  render();
  saveGame();
});
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
hintButton.addEventListener("click", giveHint);
eraseButton.addEventListener("click", eraseSelected);
resetButton.addEventListener("click", resetPuzzle);
mistakeToggle.addEventListener("change", () => {
  state.mistakeChecking = mistakeToggle.checked;
  render();
  saveGame();
  savePreferences();
});

settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) closeSettings();
});

completionModal.addEventListener("click", (event) => {
  if (event.target === completionModal) completionModal.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSettings();
    return;
  }
  if (state.screen !== "game" || event.metaKey || event.ctrlKey || event.altKey) return;
  if (/^[1-9]$/.test(event.key)) {
    enterNumber(Number(event.key));
    event.preventDefault();
  }
  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
    eraseSelected();
    event.preventDefault();
  }
  if (event.key === "n" || event.key === "N") {
    state.notesMode = !state.notesMode;
    render();
    saveGame();
  }
  if (event.key.startsWith("Arrow") && state.selected) {
    const next = { ...state.selected };
    if (event.key === "ArrowUp") next.row = Math.max(0, next.row - 1);
    if (event.key === "ArrowDown") next.row = Math.min(8, next.row + 1);
    if (event.key === "ArrowLeft") next.col = Math.max(0, next.col - 1);
    if (event.key === "ArrowRight") next.col = Math.min(8, next.col + 1);
    state.selected = next;
    render();
    saveGame();
    event.preventDefault();
  }
});

loadPreferences();
difficultySelect.value = state.difficulty;
showTitle();
