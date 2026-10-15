import { searchBooks, getGoogleBookDetails } from "./api.js";
import { renderBookGrid, renderBookDetails } from "./display.js";
import { getReadingList, saveReadingList, showToast } from "./utils.js";

const elements = {
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#search-input"),
  resultsGrid: document.querySelector("#results-grid"),
  resultsHeading: document.querySelector("#results-heading"),
  statusMessage: document.querySelector("#status-message"),
  loadMore: document.querySelector("#load-more"),
  sortResults: document.querySelector("#sort-results"),
  libraryGrid: document.querySelector("#library-grid"),
  libraryEmpty: document.querySelector("#library-empty"),
  librarySort: document.querySelector("#library-sort"),
  statusFilters: document.querySelector("#status-filters"),
  navCount: document.querySelector("#nav-count"),
  dialog: document.querySelector("#book-dialog"),
  dialogContent: document.querySelector("#dialog-content"),
  dialogClose: document.querySelector("#dialog-close"),
  toast: document.querySelector("#toast")
};

const state = {
  results: [],
  query: "",
  page: 0,
  pageSize: 12,
  totalItems: 0,
  currentFilter: "all",
  currentDialogBook: null,
  controller: null,
  savedBooks: getReadingList()
};

function getSavedBook(id) {
  return state.savedBooks.find((book) => book.id === id);
}

function persistLibrary() {
  const saved = saveReadingList(state.savedBooks);
  if (!saved) showToast("Your browser could not save changes. Check storage settings.");
  updateLibrary();
}

function updateLibrary() {
  const counts = {
    all: state.savedBooks.length,
    want: state.savedBooks.filter((book) => book.status === "want").length,
    reading: state.savedBooks.filter((book) => book.status === "reading").length,
    finished: state.savedBooks.filter((book) => book.status === "finished").length
  };
  elements.navCount.textContent = counts.all;
  document.querySelector("#count-all").textContent = counts.all;
  document.querySelector("#count-want").textContent = counts.want;
  document.querySelector("#count-reading").textContent = counts.reading;
  document.querySelector("#count-finished").textContent = counts.finished;

  let visibleBooks = state.currentFilter === "all"
    ? [...state.savedBooks]
    : state.savedBooks.filter((book) => book.status === state.currentFilter);

  const sort = elements.librarySort.value;
  visibleBooks.sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "author") return a.authorText.localeCompare(b.authorText);
    return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
  });

  renderBookGrid(elements.libraryGrid, visibleBooks, { inLibrary: true });
  elements.libraryEmpty.classList.toggle("hidden", visibleBooks.length > 0);
  elements.libraryGrid.classList.toggle("hidden", visibleBooks.length === 0);
  elements.libraryGrid.setAttribute("aria-label", `${visibleBooks.length} books in filtered reading list`);

  document.querySelectorAll(".filter-tab").forEach((button) => {
    const active = button.dataset.filter === state.currentFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderResults() {
  const sorted = [...state.results];
  if (elements.sortResults.value === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
  if (elements.sortResults.value === "newest") sorted.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
  renderBookGrid(elements.resultsGrid, sorted);
  elements.resultsGrid.classList.toggle("hidden", sorted.length === 0);
}

function setLoading(isLoading, message = "") {
  elements.searchForm.querySelector('button[type="submit"]').disabled = isLoading;
  elements.searchForm.querySelector('button[type="submit"]').innerHTML = isLoading
    ? '<span class="spinner" aria-hidden="true"></span> Searching'
    : 'Search <span aria-hidden="true">→</span>';
  elements.statusMessage.classList.toggle("loading", isLoading);
  elements.statusMessage.classList.toggle("hidden", !message && !isLoading);
  if (message) elements.statusMessage.textContent = message;
}

async function runSearch(query, { append = false } = {}) {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) {
    elements.searchInput.setCustomValidity("Please enter at least two characters.");
    elements.searchInput.reportValidity();
    elements.searchInput.setCustomValidity("");
    return;
  }

  state.query = cleanQuery;
  if (!append) {
    state.page = 0;
    state.results = [];
    elements.resultsGrid.innerHTML = "";
    elements.resultsGrid.classList.add("hidden");
  }
  state.controller?.abort();
  state.controller = new AbortController();
  setLoading(true, "Looking through the shelves…");
  elements.resultsHeading.textContent = `Searching for “${cleanQuery}”`;
  elements.loadMore.classList.add("hidden");

  try {
    const result = await searchBooks(cleanQuery, {
      startIndex: state.page * state.pageSize,
      maxResults: state.pageSize,
      signal: state.controller.signal
    });
    const existingIds = new Set(state.results.map((book) => book.id));
    const freshBooks = result.books.filter((book) => !existingIds.has(book.id));
    state.results = append ? [...state.results, ...freshBooks] : result.books;
    state.totalItems = result.totalItems;
    renderResults();
    const sourceText = result.sources.join(" + ");
    elements.resultsHeading.textContent = `${state.results.length} books found for “${cleanQuery}”`;
    if (state.results.length === 0) {
      setLoading(false, "No books found. Try another title, author, or subject.");
    } else {
      setLoading(false, result.partialFailure
        ? `Some results loaded from ${sourceText}. One catalog may be temporarily unavailable.`
        : `Results gathered from ${sourceText}. Select a cover or Details to learn more.`);
    }
    elements.loadMore.classList.toggle("hidden", state.results.length >= state.totalItems || state.results.length < 1);
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error("Book search failed:", error);
    setLoading(false, error.message || "Something went wrong while searching. Please try again.");
    elements.resultsHeading.textContent = "Search unavailable";
  } finally {
    elements.searchForm.querySelector('button[type="submit"]').disabled = false;
    elements.searchForm.querySelector('button[type="submit"]').innerHTML = 'Search <span aria-hidden="true">→</span>';
  }
}

function addBook(book) {
  if (!book) return;
  if (getSavedBook(book.id)) {
    showToast("That book is already on your reading list.");
    return;
  }
  state.savedBooks.unshift({
    ...book,
    authors: Array.isArray(book.authors) ? book.authors : [],
    categories: Array.isArray(book.categories) ? book.categories : [],
    status: "want",
    addedAt: new Date().toISOString()
  });
  persistLibrary();
  showToast(`Added “${book.title}” to your reading list.`);
  if (state.currentDialogBook?.id === book.id) openDetails(book.id);
}

function removeBook(id) {
  const book = getSavedBook(id);
  if (!book) return;
  state.savedBooks = state.savedBooks.filter((item) => item.id !== id);
  persistLibrary();
  showToast(`Removed “${book.title}” from your reading list.`);
  if (state.currentDialogBook?.id === id) {
    const resultBook = state.results.find((item) => item.id === id) || book;
    openDetails(resultBook.id);
  }
}

function changeStatus(id, status) {
  const allowed = ["want", "reading", "finished"];
  if (!allowed.includes(status)) return;
  const book = getSavedBook(id);
  if (!book) return;
  book.status = status;
  book.updatedAt = new Date().toISOString();
  persistLibrary();
  showToast(`Updated reading status: ${status === "want" ? "Want to read" : status === "reading" ? "Currently reading" : "Finished"}.`);
}

async function openDetails(id) {
  let book = state.results.find((item) => item.id === id) || getSavedBook(id);
  if (!book) {
    showToast("That book could not be found. Try searching again.");
    return;
  }
  // Fetch the full Google Books record when possible; Open Library items already have their own catalog link.
  if (book.source === "Google Books") {
    try {
      const fullRecord = await getGoogleBookDetails(book.id);
      if (fullRecord) {
        book = { ...book, ...fullRecord };
        const resultIndex = state.results.findIndex((item) => item.id === id);
        if (resultIndex >= 0) state.results[resultIndex] = book;
        const savedIndex = state.savedBooks.findIndex((item) => item.id === id);
        if (savedIndex >= 0) state.savedBooks[savedIndex] = { ...state.savedBooks[savedIndex], ...book };
        if (savedIndex >= 0) saveReadingList(state.savedBooks);
      }
    } catch (error) {
      console.warn("Could not fetch the full book record:", error);
    }
  }
  state.currentDialogBook = book;
  elements.dialogContent.innerHTML = renderBookDetails(book, Boolean(getSavedBook(id)));
  if (!elements.dialog.open) elements.dialog.showModal();
}

function handleBookAction(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;
  const book = state.results.find((item) => item.id === id) || getSavedBook(id);
  switch (action) {
    case "details":
      openDetails(id);
      break;
    case "add":
      addBook(book);
      break;
    case "remove":
      removeBook(id);
      break;
    case "status":
      changeStatus(id, target.value);
      break;
    case "dialog-add":
      addBook(state.currentDialogBook);
      break;
    case "dialog-remove":
      removeBook(id);
      break;
    default:
      break;
  }
}

// Event 1: form submission starts a search.
elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(elements.searchInput.value);
});

// Event 2: suggested-search chips populate the input and search immediately.
document.querySelector(".quick-searches").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-query]");
  if (!chip) return;
  elements.searchInput.value = chip.dataset.query;
  runSearch(chip.dataset.query);
});

// Event 3: results sorting changes the rendered order.
elements.sortResults.addEventListener("change", renderResults);

// Event 4: load more requests the next page of results.
elements.loadMore.addEventListener("click", () => {
  state.page += 1;
  runSearch(state.query, { append: true });
});

// Event 5: delegated card actions in search results.
elements.resultsGrid.addEventListener("click", handleBookAction);

// Event 6: delegated card actions in the reading list.
elements.libraryGrid.addEventListener("click", handleBookAction);

// Event 7: status dropdown updates a saved book.
elements.libraryGrid.addEventListener("change", (event) => {
  if (event.target.matches('[data-action="status"]')) changeStatus(event.target.dataset.id, event.target.value);
});

// Event 8: filter tabs select which reading-list category is shown.
elements.statusFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.currentFilter = button.dataset.filter;
  updateLibrary();
});

// Event 9: reading-list sort changes visible order.
elements.librarySort.addEventListener("change", updateLibrary);

// Event 10: modal buttons can add/remove a book.
elements.dialogContent.addEventListener("click", handleBookAction);

// Event 11: modal close button.
elements.dialogClose.addEventListener("click", () => elements.dialog.close());

// Event 12: clicking the backdrop closes the modal.
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

// Event 13: Escape is supported natively by <dialog>; this event restores focus to the prior trigger.
elements.dialog.addEventListener("close", () => {
  state.currentDialogBook = null;
});

// Event 14: pressing Enter in the search field is handled by the form; Escape clears a focused query.
elements.searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.searchInput.value) {
    elements.searchInput.value = "";
    elements.searchInput.blur();
  }
});

// Initial render restores saved books after refresh.
updateLibrary();
setLoading(false, "");
elements.resultsHeading.textContent = "A few places to begin";
