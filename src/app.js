const progressBar = document.querySelector(".reading-progress span");
const backToTop = document.querySelector(".back-to-top");
const operationSearch = document.querySelector("#operation-search");
const operationPanel = document.querySelector("#operation-panel");
const operationResults = document.querySelector("#operation-results");
const operationCollapse = document.querySelector("#operation-collapse");
const operationToggle = document.querySelector("#operation-toggle");
const operationData = JSON.parse(document.querySelector("#operation-data")?.textContent ?? "[]");

const setOperationPanelOpen = (isOpen) => {
  operationPanel?.classList.toggle("is-open", isOpen);
  if (operationCollapse) {
    operationCollapse.textContent = isOpen ? "−" : "+";
    operationCollapse.setAttribute("aria-label", isOpen ? "折叠操作引导" : "展开操作引导");
  }
  if (operationToggle) {
    operationToggle.textContent = isOpen ? "收起" : "展开";
    operationToggle.setAttribute("aria-expanded", String(isOpen));
  }
};

const renderOperationResults = (query) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    operationResults.innerHTML = "<p class=\"operation-hint\">输入关键词查找操作步骤。</p>";
    setOperationPanelOpen(false);
    return;
  }

  const results = operationData.filter(({ searchText }) => searchText.includes(normalizedQuery));
  setOperationPanelOpen(true);
  operationResults.innerHTML = results.length
    ? results.map(({ title, html }) => `<article class=\"operation-result\"><h2>${title}</h2>${html}</article>`).join("")
    : "<p class=\"operation-hint\">没有找到相关操作。</p>";
};

operationSearch?.addEventListener("input", (event) => renderOperationResults(event.target.value));
operationCollapse?.addEventListener("click", () => {
  setOperationPanelOpen(!operationPanel.classList.contains("is-open"));
});
operationToggle?.addEventListener("click", () => {
  setOperationPanelOpen(!operationPanel.classList.contains("is-open"));
});

const updateScrollUi = () => {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  progressBar.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
  backToTop.classList.toggle("is-visible", window.scrollY > 720);
};

window.addEventListener("scroll", updateScrollUi, { passive: true });
window.addEventListener("resize", updateScrollUi);
updateScrollUi();

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelectorAll(".section-heading .heading-anchor").forEach((anchor) => {
  anchor.addEventListener("click", async (event) => {
    const url = new URL(anchor.href);
    if (!navigator.clipboard) return;

    event.preventDefault();
    history.pushState(null, "", url.hash);
    document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth" });
    await navigator.clipboard.writeText(url.href);
    anchor.closest(".section-heading")?.classList.add("link-copied");
    window.setTimeout(() => anchor.closest(".section-heading")?.classList.remove("link-copied"), 1300);
  });
});

const tocLinks = new Map(
  [...document.querySelectorAll(".toc-list a")].map((link) => [decodeURIComponent(new URL(link.href).hash.slice(1)), link])
);
const observedHeadings = [...document.querySelectorAll(".guide-content h2, .guide-content h3")];
const tocPanel = document.querySelector(".toc-panel");
const mobileLayout = window.matchMedia("(max-width: 800px)");

if (tocPanel && mobileLayout.matches) tocPanel.open = false;

document.querySelectorAll(".toc-list a").forEach((link) => {
  link.addEventListener("click", () => {
    if (tocPanel && mobileLayout.matches) tocPanel.open = false;
  });
});

if ("IntersectionObserver" in window) {
  const visibleHeadings = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleHeadings.set(entry.target.id, entry.boundingClientRect.top);
        else visibleHeadings.delete(entry.target.id);
      });

      tocLinks.forEach((link) => link.removeAttribute("aria-current"));
      const activeId = [...visibleHeadings.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
      if (activeId) tocLinks.get(activeId)?.setAttribute("aria-current", "location");
    },
    { rootMargin: "-12% 0px -72%", threshold: [0, 1] }
  );
  observedHeadings.forEach((heading) => observer.observe(heading));
}
