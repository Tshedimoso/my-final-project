export const STORAGE_KEY = "leaf-and-lore-reading-list-v1";

export function cleanText(value, fallback = "Not available") {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

export function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function truncate(value, max = 170) {
  const text = cleanText(value, "");
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function getReadingList() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((book) => book && book.id && book.title) : [];
  } catch (error) {
    console.warn("Could not read the saved reading list:", error);
    return [];
  }
}

export function saveReadingList(books) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    return true;
  } catch (error) {
    console.error("Could not save the reading list:", error);
    return false;
  }
}

export function formatYear(value) {
  if (!value) return "Year unknown";
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : String(value);
}

export function formatDate(value) {
  if (!value) return "Recently added";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  } catch {
    return "Recently added";
  }
}

export function showToast(message, duration = 2600) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove("visible"), duration);
}
