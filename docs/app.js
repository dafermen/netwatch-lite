const sections = Array.from(document.querySelectorAll(".doc-section"));
const sidebar = document.querySelector("#docs-sidebar");
const sidebarLinks = Array.from(sidebar.querySelectorAll("a[href^='#']"));
const primaryLinks = Array.from(document.querySelectorAll(".docs-primary-nav a[href^='#']"));
const menuButton = document.querySelector("#docs-menu-button");
const overlay = document.querySelector("#docs-overlay");
const themeButton = document.querySelector("#docs-theme-toggle");
const searchInput = document.querySelector("#docs-search-input");
const searchResults = document.querySelector("#docs-search-results");
const onPageNav = document.querySelector("#on-page-nav");
const previousLink = document.querySelector("#docs-previous");
const nextLink = document.querySelector("#docs-next");

let activeSectionId = "";

function closeMenu() {
  document.body.classList.remove("docs-menu-open");
  menuButton.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  const isOpen = document.body.classList.toggle("docs-menu-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
}

function getPreferredTheme() {
  const savedTheme = localStorage.getItem("netwatch-docs-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === "dark" ? "Tema claro" : "Tema oscuro";
  themeButton.setAttribute("aria-pressed", String(theme === "dark"));
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark"
    ? "light"
    : "dark";
  localStorage.setItem("netwatch-docs-theme", nextTheme);
  applyTheme(nextTheme);
}

function ensureHeadingIds(section) {
  const headings = Array.from(section.querySelectorAll("h2, h3"));
  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = `${section.id}-heading-${index + 1}`;
    }
  });
  return headings;
}

function updateOnPageNavigation(section) {
  const headings = ensureHeadingIds(section);
  onPageNav.replaceChildren();

  headings.forEach(heading => {
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    if (heading.tagName === "H3") {
      link.classList.add("toc-child");
    }
    onPageNav.append(link);
  });
}

function updatePagination(sectionIndex) {
  const previous = sections[sectionIndex - 1];
  const next = sections[sectionIndex + 1];

  updatePaginationLink(previousLink, previous, "Anterior");
  updatePaginationLink(nextLink, next, "Siguiente");
}

function updatePaginationLink(link, section, label) {
  link.hidden = !section;
  if (!section) {
    link.removeAttribute("href");
    return;
  }

  link.href = `#${section.id}`;
  link.replaceChildren();
  const direction = document.createElement("small");
  direction.textContent = label;
  const title = document.createElement("span");
  title.textContent = section.querySelector("h2").textContent.trim();
  link.append(direction, title);
}

function setActiveSection(sectionId, updateHash = false) {
  if (!sectionId || sectionId === activeSectionId) {
    return;
  }

  const sectionIndex = sections.findIndex(section => section.id === sectionId);
  if (sectionIndex < 0) {
    return;
  }

  activeSectionId = sectionId;
  [...sidebarLinks, ...primaryLinks].forEach(link => {
    const isActive = link.getAttribute("href") === `#${sectionId}`;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  updateOnPageNavigation(sections[sectionIndex]);
  updatePagination(sectionIndex);

  if (updateHash) {
    history.replaceState(null, "", `#${sectionId}`);
  }
}

function createSearchResult(section, query) {
  const link = document.createElement("a");
  link.href = `#${section.id}`;

  const title = document.createElement("strong");
  title.textContent = section.querySelector("h2").textContent.trim();

  const text = section.textContent.replace(/\s+/g, " ").trim();
  const matchIndex = text.toLocaleLowerCase().indexOf(query);
  const start = Math.max(0, matchIndex - 45);
  const excerpt = document.createElement("small");
  excerpt.textContent = `${start > 0 ? "..." : ""}${text.slice(start, start + 125)}${text.length > start + 125 ? "..." : ""}`;

  link.append(title, excerpt);
  link.addEventListener("click", () => {
    searchResults.hidden = true;
    searchInput.value = "";
    closeMenu();
  });
  return link;
}

function searchDocumentation() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  searchResults.replaceChildren();

  if (query.length < 2) {
    searchResults.hidden = true;
    return;
  }

  const matches = sections
    .filter(section => section.textContent.toLocaleLowerCase().includes(query))
    .slice(0, 8);

  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "docs-search-empty";
    empty.textContent = "No se encontraron resultados.";
    searchResults.append(empty);
  } else {
    matches.forEach(section => {
      searchResults.append(createSearchResult(section, query));
    });
  }

  searchResults.hidden = false;
}

function initializeSectionTracking() {
  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

    if (visible.length > 0) {
      setActiveSection(visible[0].target.id, true);
    }
  }, {
    rootMargin: "-20% 0px -65% 0px",
    threshold: 0
  });

  sections.forEach(section => observer.observe(section));
}

function initialize() {
  applyTheme(getPreferredTheme());
  sections.forEach(ensureHeadingIds);

  const initialId = window.location.hash.slice(1);
  const initialSection = sections.find(section => section.id === initialId) ?? sections[0];
  setActiveSection(initialSection.id);
  initializeSectionTracking();

  const initialTarget = document.getElementById(window.location.hash.slice(1));
  if (initialTarget) {
    requestAnimationFrame(() => initialTarget.scrollIntoView());
  }
}

menuButton.addEventListener("click", toggleMenu);
overlay.addEventListener("click", closeMenu);
themeButton.addEventListener("click", toggleTheme);
searchInput.addEventListener("input", searchDocumentation);

sidebar.addEventListener("click", event => {
  if (event.target.closest("a")) {
    closeMenu();
  }
});

document.addEventListener("click", event => {
  if (!event.target.closest(".docs-search")) {
    searchResults.hidden = true;
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeMenu();
    searchResults.hidden = true;
  }
});

window.addEventListener("hashchange", () => {
  const sectionId = window.location.hash.slice(1);
  if (sections.some(section => section.id === sectionId)) {
    setActiveSection(sectionId);
  }
});

initialize();
