import { escapeHTML, truncate, formatDate } from "./utils.js";

export function renderBookCard(book, { inLibrary = false } = {}) {
  const cover = book.cover
    ? `<img src="${escapeHTML(book.cover)}" alt="Cover of ${escapeHTML(book.title)}" loading="lazy" />`
    : `<div class="cover-placeholder" aria-label="No cover available"><span>✦</span><small>cover unavailable</small></div>`;
  const categories = (book.categories || []).slice(0, 2).map((tag) => `<span class="mini-tag">${escapeHTML(tag)}</span>`).join("");
  const action = inLibrary
    ? `<button type="button" class="button button-small button-outline" data-action="details" data-id="${escapeHTML(book.id)}">Details</button>
       <label class="sr-only" for="status-${escapeHTML(book.id)}">Reading status for ${escapeHTML(book.title)}</label>
       <select id="status-${escapeHTML(book.id)}" class="status-select" data-action="status" data-id="${escapeHTML(book.id)}">
         <option value="want" ${book.status === "want" ? "selected" : ""}>Want to read</option>
         <option value="reading" ${book.status === "reading" ? "selected" : ""}>Currently reading</option>
         <option value="finished" ${book.status === "finished" ? "selected" : ""}>Finished</option>
       </select>
       <button type="button" class="icon-button remove-button" data-action="remove" data-id="${escapeHTML(book.id)}" aria-label="Remove ${escapeHTML(book.title)} from reading list" title="Remove from list">×</button>`
    : `<button type="button" class="button button-small button-outline" data-action="details" data-id="${escapeHTML(book.id)}">Details</button>
       <button type="button" class="button button-small button-add" data-action="add" data-id="${escapeHTML(book.id)}">+ Add to list</button>`;
  return `
    <article class="book-card" data-book-id="${escapeHTML(book.id)}">
      <button type="button" class="cover-button" data-action="details" data-id="${escapeHTML(book.id)}" aria-label="View details for ${escapeHTML(book.title)}">${cover}</button>
      <div class="book-card-content">
        <div class="book-meta"><span>${escapeHTML(book.year || "Year unknown")}</span><span class="source-dot"></span><span>${escapeHTML(book.source || "Book catalog")}</span></div>
        <h3>${escapeHTML(book.title)}</h3>
        <p class="book-author">${escapeHTML(book.authorText || "Author unknown")}</p>
        <p class="book-description">${escapeHTML(truncate(book.description, 112))}</p>
        <div class="book-tags">${categories}</div>
        ${inLibrary ? `<p class="added-date">Added ${escapeHTML(formatDate(book.addedAt))}</p>` : ""}
        <div class="card-actions">${action}</div>
      </div>
    </article>`;
}

export function renderBookGrid(element, books, options = {}) {
  element.innerHTML = books.map((book) => renderBookCard(book, options)).join("");
}

export function renderBookDetails(book, isSaved) {
  const cover = book.cover
    ? `<img class="detail-cover" src="${escapeHTML(book.cover)}" alt="Cover of ${escapeHTML(book.title)}" />`
    : `<div class="detail-cover cover-placeholder"><span>✦</span><small>cover unavailable</small></div>`;
  const categories = (book.categories || []).length
    ? book.categories.map((category) => `<span class="mini-tag">${escapeHTML(category)}</span>`).join("")
    : `<span class="muted">No subject tags available</span>`;
  const rating = book.averageRating ? `${book.averageRating.toFixed(1)} / 5 (${book.ratingsCount} ratings)` : "No rating available";
  const link = book.infoLink || book.previewLink;
  return `
    <div class="detail-layout">
      <div class="detail-cover-wrap">${cover}</div>
      <div class="detail-copy">
        <p class="eyebrow">${escapeHTML(book.source || "BOOK DETAILS")}</p>
        <h2 id="dialog-title">${escapeHTML(book.title)}</h2>
        ${book.subtitle ? `<p class="detail-subtitle">${escapeHTML(book.subtitle)}</p>` : ""}
        <p class="detail-author">by ${escapeHTML(book.authorText || "Author unknown")}</p>
        <p class="detail-description">${escapeHTML(book.description || "No description is available.")}</p>
        <div class="detail-facts">
          <div><span>Published</span><strong>${escapeHTML(book.year || "Unknown")}</strong></div>
          <div><span>Publisher</span><strong>${escapeHTML(book.publisher || "Unknown")}</strong></div>
          <div><span>Pages</span><strong>${book.pageCount ? escapeHTML(book.pageCount) : "Unknown"}</strong></div>
          <div><span>Language</span><strong>${escapeHTML(book.language || "Unknown")}</strong></div>
          <div><span>Community rating</span><strong>${escapeHTML(rating)}</strong></div>
        </div>
        <div class="detail-tags">${categories}</div>
        <div class="detail-actions">
          <button type="button" class="button button-dark" data-action="${isSaved ? "dialog-remove" : "dialog-add"}" data-id="${escapeHTML(book.id)}">${isSaved ? "Remove from my list" : "+ Add to my list"}</button>
          ${link ? `<a class="button button-outline" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">Explore source ↗</a>` : ""}
        </div>
        ${book.isbn ? `<p class="isbn-line">ISBN: ${escapeHTML(book.isbn)}</p>` : ""}
      </div>
    </div>`;
}
