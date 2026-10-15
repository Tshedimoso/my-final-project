import { cleanText, formatYear } from "./utils.js";

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";

function normalizeGoogleBook(item) {
  const info = item.volumeInfo || {};
  const imageLinks = info.imageLinks || {};
  const authors = Array.isArray(info.authors) ? info.authors : [];
  const categories = Array.isArray(info.categories) ? info.categories : [];
  return {
    id: item.id || `google-${crypto.randomUUID()}`,
    source: "Google Books",
    title: cleanText(info.title, "Untitled book"),
    subtitle: cleanText(info.subtitle, ""),
    authors,
    authorText: authors.join(", ") || "Author unknown",
    publishedDate: info.publishedDate || "",
    year: formatYear(info.publishedDate),
    description: cleanText(info.description, "No description is available for this book yet."),
    cover: (imageLinks.thumbnail || imageLinks.smallThumbnail || "").replace("http://", "https://"),
    publisher: cleanText(info.publisher, "Publisher unknown"),
    categories,
    pageCount: Number(info.pageCount) || null,
    language: info.language || "Unknown",
    previewLink: info.previewLink || "",
    infoLink: info.infoLink || "",
    averageRating: Number(info.averageRating) || null,
    ratingsCount: Number(info.ratingsCount) || 0,
    isbn: (info.industryIdentifiers || []).map((entry) => entry.identifier).join(", "),
    addedAt: null,
    status: "want"
  };
}

function normalizeOpenLibraryBook(item) {
  const key = item.key || "";
  const id = `openlibrary-${key.split("/").pop() || crypto.randomUUID()}`;
  const authors = Array.isArray(item.author_name) ? item.author_name : [];
  return {
    id,
    source: "Open Library",
    title: cleanText(item.title, "Untitled book"),
    subtitle: "",
    authors,
    authorText: authors.join(", ") || "Author unknown",
    publishedDate: item.first_publish_year ? String(item.first_publish_year) : "",
    year: item.first_publish_year ? String(item.first_publish_year) : "Year unknown",
    description: "Open Library result. Open the book details to explore the available catalog information.",
    cover: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : "",
    publisher: Array.isArray(item.publisher) ? (item.publisher[0] || "Publisher unknown") : "Publisher unknown",
    categories: Array.isArray(item.subject) ? item.subject.slice(0, 8) : [],
    pageCount: Number(item.number_of_pages_median) || null,
    language: Array.isArray(item.language) ? item.language[0] : "Unknown",
    previewLink: key ? `https://openlibrary.org${key}` : "",
    infoLink: key ? `https://openlibrary.org${key}` : "",
    averageRating: null,
    ratingsCount: 0,
    isbn: Array.isArray(item.isbn) ? item.isbn.slice(0, 3).join(", ") : "",
    addedAt: null,
    status: "want"
  };
}

async function fetchJSON(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status}). Please try again.`);
  return response.json();
}

export async function searchGoogleBooks(query, { startIndex = 0, maxResults = 12, signal } = {}) {
  const params = new URLSearchParams({
    q: query,
    startIndex: String(startIndex),
    maxResults: String(maxResults),
    printType: "books",
    orderBy: "relevance"
  });
  const data = await fetchJSON(`${GOOGLE_BOOKS_URL}?${params}`, signal);
  return {
    totalItems: Number(data.totalItems) || 0,
    books: (data.items || []).map(normalizeGoogleBook),
    source: "Google Books"
  };
}

export async function searchOpenLibrary(query, { limit = 12, signal } = {}) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    fields: "key,title,author_name,first_publish_year,cover_i,publisher,subject,number_of_pages_median,language,isbn"
  });
  const data = await fetchJSON(`${OPEN_LIBRARY_SEARCH_URL}?${params}`, signal);
  return {
    totalItems: Number(data.numFound) || 0,
    books: (data.docs || []).map(normalizeOpenLibraryBook),
    source: "Open Library"
  };
}

export async function getGoogleBookDetails(bookId, signal) {
  if (!bookId || String(bookId).startsWith("openlibrary-")) return null;
  const item = await fetchJSON(`${GOOGLE_BOOKS_URL}/${encodeURIComponent(bookId)}`, signal);
  return normalizeGoogleBook(item);
}

export async function searchBooks(query, options = {}) {
  const { signal, startIndex = 0, maxResults = 12 } = options;
  // Both APIs are used; a failure in one source should not hide useful results from the other.
  const [googleResult, libraryResult] = await Promise.allSettled([
    searchGoogleBooks(query, { startIndex, maxResults, signal }),
    searchOpenLibrary(query, { limit: maxResults, signal })
  ]);
  const google = googleResult.status === "fulfilled" ? googleResult.value : { books: [], totalItems: 0 };
  const openLibrary = libraryResult.status === "fulfilled" ? libraryResult.value : { books: [], totalItems: 0 };
  if (!google.books.length && !openLibrary.books.length) {
    const reason = googleResult.status === "rejected" ? googleResult.reason : libraryResult.reason;
    throw new Error(reason?.message || "Neither book service returned results. Check your connection and try again.");
  }

  const merged = [...google.books, ...openLibrary.books];
  const seen = new Set();
  const books = merged.filter((book) => {
    const key = `${book.title.toLowerCase()}|${book.authorText.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    books,
    totalItems: google.totalItems + openLibrary.totalItems,
    sources: [
      ...(google.books.length ? ["Google Books"] : []),
      ...(openLibrary.books.length ? ["Open Library"] : [])
    ],
    partialFailure: googleResult.status === "rejected" || libraryResult.status === "rejected"
  };
}
