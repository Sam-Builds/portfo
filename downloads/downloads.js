function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function getStatusClass(status) {
  return (status || "").toLowerCase() === "available" ? "status-badge" : "status-badge";
}

function renderTags(items) {
  return normalizeArray(items)
    .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
    .join("");
}

function renderMetaChip(label, value) {
  if (!value) {
    return "";
  }

  return `
    <div class="meta-chip">
      <span class="meta-label">${escapeHtml(label)}</span>
      <span class="meta-value">${escapeHtml(value)}</span>
    </div>
  `;
}

async function loadDownloadsContent() {
  const response = await fetch("../content.json");
  if (!response.ok) {
    throw new Error("Failed to load downloads content.");
  }

  const content = await response.json();
  return content.downloads || { apps: [] };
}

function renderDownloadsIndex(downloads) {
  const titleEl = document.getElementById("downloadsTitle");
  const descriptionEl = document.getElementById("downloadsDescription");
  const appCountEl = document.getElementById("appCount");
  const appsGrid = document.getElementById("appsGrid");

  if (titleEl) {
    titleEl.textContent = downloads.title || "Downloads";
  }

  if (descriptionEl) {
    descriptionEl.textContent =
      downloads.description ||
      "A central place for app builds, hosted releases, and project-specific downloads.";
  }

  if (appCountEl) {
    appCountEl.textContent = normalizeArray(downloads.apps).length;
  }

  const appCards = normalizeArray(downloads.apps)
    .map((app) => {
      const slug = app.slug || "";
      const href = `./app.html?slug=${encodeURIComponent(slug)}`;

      return `
        <article class="card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(app.title || "Untitled app")}</h3>
              <p class="meta-copy">${escapeHtml(app.type || "App")}</p>
            </div>
          </div>
          <p>${escapeHtml(app.summary || "No summary provided yet.")}</p>
          <div class="card-meta">
            ${renderMetaChip("Version", app.version)}
            ${renderMetaChip("Updated", app.updated)}
            ${renderMetaChip("Size", app.size)}
          </div>
          <div class="tag-row">${renderTags(app.platforms)}</div>
          <div class="card-footer">
            <a class="card-link" href="${escapeAttribute(href)}">Open download page -></a>
          </div>
        </article>
      `;
    })
    .join("");

  appsGrid.innerHTML =
    appCards ||
    `
      <section class="empty-state">
        <h2>No apps listed yet</h2>
        <p>Add items under <strong>downloads.apps</strong> in content.json and they will appear here automatically.</p>
      </section>
    `;
}

function renderAction(link, type) {
  if (!link || !link.url || !link.label) {
    return "";
  }

  return `<a class="download-link ${type}" href="${escapeAttribute(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
}

function buildActionMap(app) {
  if (app && app.actions && typeof app.actions === "object" && !Array.isArray(app.actions)) {
    return app.actions;
  }

  const legacyActions = {};
  if (app?.primaryAction?.label && app?.primaryAction?.url) {
    legacyActions[app.primaryAction.label] = app.primaryAction.url;
  }

  normalizeArray(app?.secondaryActions).forEach((link) => {
    if (link?.label && link?.url) {
      legacyActions[link.label] = link.url;
    }
  });

  return legacyActions;
}

function renderActionsFromMap(actionMap) {
  return Object.entries(actionMap || {})
    .filter(([label, url]) => label && url)
    .map(
      ([label, url], index) =>
        `<a class="download-link ${index === 0 ? "primary" : "secondary"}" href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
    )
    .join("");
}

function renderDownloadsList(items) {
  const downloads = normalizeArray(items);
  if (!downloads.length) {
    return '<div class="downloads-note">No direct installer is published here yet. Use the main app link for the live version.</div>';
  }

  return downloads
    .map(
      (item) => `
        <div class="download-item">
          <strong>${escapeHtml(item.label || "Download")}</strong>
          ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}
          <div class="actions-row" style="margin-top: 14px;">
            <a class="action-link" href="${escapeAttribute(item.url || "#")}" target="_blank" rel="noopener noreferrer">Start download</a>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderListBlock(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  const values = normalizeArray(items);
  if (!values.length) {
    container.remove();
    return;
  }

  container.innerHTML = values.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderAppDetail(downloads) {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const app = normalizeArray(downloads.apps).find((entry) => entry.slug === slug);
  const pageTitle = document.getElementById("appPageTitle");
  const detailRoot = document.getElementById("appDetailRoot");

  if (!app) {
    if (pageTitle) {
      pageTitle.textContent = "Download not found";
    }

    detailRoot.innerHTML = `
      <section class="empty-state">
        <h2>App page not found</h2>
        <p>The requested download page does not exist in content.json.</p>
        <div class="hero-actions" style="margin-top: 18px;">
          <a class="btn btn-primary" href="./">Back to Downloads</a>
          <a class="btn btn-secondary" href="../index.html">Return to Main Site</a>
        </div>
      </section>
    `;
    document.title = "Download not found | SamStack";
    return;
  }

  document.title = `${app.title} Downloads | SamStack`;
  if (pageTitle) {
    pageTitle.textContent = app.title;
  }

  detailRoot.innerHTML = `
    <div class="detail-layout">
      <section class="detail-card">
    

        <div class="card-top">
          <div>
            <p class="eyebrow" style="margin-bottom: 14px; color: var(--gradient-start); background: rgba(112, 143, 150, 0.1); border-color: rgba(112, 143, 150, 0.16);">${escapeHtml(app.type || "App")}</p>
            <h1 class="detail-title">${escapeHtml(app.title)}</h1>
          </div>
        </div>

        <p class="section-subtitle" style="margin-top: 14px;">${escapeHtml(app.summary || "")}</p>
        <div class="tag-row">${renderTags(app.platforms)}</div>

        <div class="meta-grid">
          ${renderMetaChip("Version", app.version)}
          ${renderMetaChip("Updated", app.updated)}
          ${renderMetaChip("Size", app.size)}
        </div>

        <div class="detail-copy">
          ${normalizeArray(app.description)
            .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
            .join("")}
        </div>

        <div class="list-block">
          <h2>Highlights</h2>
          <ul id="highlightsList"></ul>
        </div>

        <div class="list-block">
          <h2>Requirements</h2>
          <ul id="requirementsList"></ul>
        </div>
      </section>

      <aside class="downloads-list">
        <h2>Actions</h2>
        <div class="downloads-stack">
          ${renderActionsFromMap(buildActionMap(app))}
        </div>

      </aside>
    </div>
  `;

  renderListBlock("highlightsList", app.highlights);
  renderListBlock("requirementsList", app.requirements);
}

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  try {
    const downloads = await loadDownloadsContent();
    if (page === "downloads-index") {
      renderDownloadsIndex(downloads);
      return;
    }

    if (page === "downloads-detail") {
      renderAppDetail(downloads);
    }
  } catch (error) {
    const errorTarget =
      document.getElementById("appsGrid") || document.getElementById("appDetailRoot");

    if (errorTarget) {
      errorTarget.innerHTML = `
        <section class="empty-state">
          <h2>Could not load downloads</h2>
          <p>${escapeHtml(error.message)}</p>
        </section>
      `;
    }
  }
});