const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url}`);
  }
  return response.json();
};

const formatNoteDate = (value) =>
  new Intl.DateTimeFormat("en", { month: "long", year: "numeric", day: "numeric" }).format(new Date(value));

const createTagList = (tags) => tags.map((tag) => `<span>${tag}</span>`).join("");

const titleCase = (value) =>
  value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

async function renderSiteContent() {
  const targets = [
    document.querySelector("[data-featured-analysis]"),
    document.querySelector("[data-publications-list]"),
    document.querySelector("[data-commentary-list]")
  ].filter(Boolean);

  if (!targets.length) return;

  const content = await fetchJson("data/site-content.json");

  document.querySelectorAll("[data-featured-analysis]").forEach((container) => {
    const limit = Number(container.dataset.featuredLimit || content.featured_analysis.length);
    const items = content.featured_analysis.slice(0, limit);
    container.innerHTML = `
      ${items
        .map(
          (item, index) => `
            <article class="feature-slide">
              <figure>
                <img src="${item.image}" alt="">
              </figure>
              <div class="feature-slide-copy">
                <p class="publication-type">${item.tag || `Featured 0${index + 1}`}</p>
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                <a class="button secondary" href="${item.link}">${item.button || "Read More"}</a>
              </div>
            </article>
          `
        )
        .join("")}
    `;
  });

  const publicationList = document.querySelector("[data-publications-list]");
  if (publicationList) {
    const limit = Number(publicationList.dataset.publicationsLimit || content.publications.length);
    publicationList.innerHTML = content.publications
      .slice(0, limit)
      .map(
        (item) => `
          <article class="publication-row">
            <div>
              <p class="publication-type">${item.content_type} | ${item.date}</p>
              <h2>${item.title}</h2>
              <p>${item.abstract}</p>
              <div class="tag-list">${createTagList(item.tags)}</div>
            </div>
            <a class="button" href="${item.pdf}">PDF</a>
          </article>
        `
      )
      .join("");
  }

  document.querySelectorAll("[data-commentary-list]").forEach((container) => {
    const limit = Number(container.dataset.commentaryLimit || content.commentary.length);
    container.innerHTML = [...content.commentary]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit)
      .map(
        (note) => `
          <article class="content-card">
            <h3>${note.title}</h3>
            <p>${note.summary}</p>
            <span class="topic-chip">${note.topic}</span>
          </article>
        `
      )
      .join("");
  });
}

async function renderMapping() {
  const root = document.querySelector("[data-mapping]");
  if (!root) return;

  const mappingData = await fetchJson("data/mapping.json");
  const records = mappingData.countries;
  const filters = mappingData.filters;
  const matrixColumns = [
    ["primary_displacement_dynamics", "Primary displacement dynamics"],
    ["social_protection_inclusion", "Social protection inclusion"],
    ["territorial_portability", "Territorial portability"],
    ["municipal_absorption", "Municipal absorption"],
    ["fiscal_sustainability", "Fiscal sustainability"],
    ["key_governance_challenge", "Key governance challenge"]
  ];
  let activeCountryId = records[0]?.id;

  const renderList = (items) => items.map((item) => `<li>${item}</li>`).join("");

  function renderTabs() {
    root.querySelectorAll("[data-mapping-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.mappingTab;
        root.querySelectorAll("[data-mapping-tab]").forEach((item) => {
          const isActive = item === tab;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-selected", String(isActive));
        });
        root.querySelectorAll("[data-mapping-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.mappingPanel !== target;
        });
      });
    });
  }

  function renderCountryChooser() {
    const chooser = root.querySelector("[data-country-chooser]");
    if (!chooser) return;
    chooser.innerHTML = records
      .map((record) => `<button class="${record.id === activeCountryId ? "is-active" : ""}" type="button" data-country-choice="${record.id}">${record.country}</button>`)
      .join("");
    chooser.querySelectorAll("[data-country-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        activeCountryId = button.dataset.countryChoice;
        renderCountryChooser();
        renderActiveProfile();
      });
    });
  }

  function renderActiveProfile() {
    const profile = root.querySelector("[data-country-profile]");
    const record = records.find((item) => item.id === activeCountryId) || records[0];
    if (!profile || !record) return;
    profile.innerHTML = `
      <article class="mapping-profile" id="${record.id}">
        <div class="mapping-profile-heading">
          <div>
            <p class="eyebrow">Country Profile</p>
            <h3>${record.country}</h3>
          </div>
        </div>

        <section>
          <h4>Overview</h4>
          <p>${record.overview}</p>
        </section>

        <section>
          <h4>Primary displacement dynamics</h4>
          <div class="tag-list">${createTagList(record.primary_displacement_dynamics)}</div>
        </section>

        <section>
          <h4>Institutional architecture</h4>
          <ul class="compact-bullets">${renderList(record.institutional_architecture)}</ul>
        </section>

        <section>
          <h4>Governance fault lines</h4>
          <ul class="compact-bullets">${renderList(record.governance_fault_lines)}</ul>
        </section>

        <section>
          <h4>Relevant systems</h4>
          <ul class="compact-bullets">${renderList(record.relevant_systems)}</ul>
        </section>

        <section>
          <h4>Reform opportunities</h4>
          <p>${record.reform_opportunities}</p>
        </section>

        <section>
          <h4>Sources</h4>
          <p>${record.sources} <a class="text-link" href="#mapping-methodology" data-open-methodology>Review methodology</a></p>
        </section>
      </article>
    `;
    profile.querySelector("[data-open-methodology]")?.addEventListener("click", (event) => {
      event.preventDefault();
      root.querySelector('[data-mapping-tab="methodology"]')?.click();
      document.getElementById("mapping-methodology")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function populateFilters() {
    const displacement = root.querySelector('[data-filter="displacement"]');
    const governance = root.querySelector('[data-filter="governance"]');
    if (displacement) {
      displacement.innerHTML = `<option value="">All displacement types</option>${filters.displacement_types.map((item) => `<option value="${item}">${item}</option>`).join("")}`;
    }
    if (governance) {
      governance.innerHTML = `<option value="">All governance areas</option>${filters.governance_areas.map((item) => `<option value="${item}">${item}</option>`).join("")}`;
    }
    root.querySelectorAll("[data-filter]").forEach((select) => select.addEventListener("change", renderMatrix));
  }

  function getFilteredRecords() {
    const displacement = root.querySelector('[data-filter="displacement"]')?.value;
    const governance = root.querySelector('[data-filter="governance"]')?.value;
    return records.filter((record) =>
      (!displacement || record.primary_displacement_dynamics.includes(displacement)) &&
      (!governance || record.governance_areas.includes(governance))
    );
  }

  function renderMatrix() {
    const head = root.querySelector("[data-mapping-matrix-head]");
    const body = root.querySelector("[data-mapping-matrix]");
    const count = root.querySelector("[data-matrix-count]");
    const visibleRecords = getFilteredRecords();
    if (!head || !body) return;

    head.innerHTML = `
      <tr>
        <th>Country</th>
        ${matrixColumns.map(([, label]) => `<th>${label}</th>`).join("")}
      </tr>
    `;
    body.innerHTML = visibleRecords
      .map((record) => `
        <tr>
          <td><button type="button" data-matrix-country="${record.id}">${record.country}</button></td>
          ${matrixColumns.map(([key]) => {
            const value = key === "primary_displacement_dynamics"
              ? record.primary_displacement_dynamics.join(", ")
              : record.comparison[key];
            return `<td>${value}</td>`;
          }).join("")}
        </tr>
      `)
      .join("");
    if (count) count.textContent = `${visibleRecords.length} ${visibleRecords.length === 1 ? "country" : "countries"} shown`;
    body.querySelectorAll("[data-matrix-country]").forEach((button) => {
      button.addEventListener("click", () => {
        activeCountryId = button.dataset.matrixCountry;
        root.querySelector('[data-mapping-tab="profiles"]')?.click();
        renderCountryChooser();
        renderActiveProfile();
      });
    });
  }

  renderTabs();
  renderCountryChooser();
  renderActiveProfile();
  populateFilters();
  renderMatrix();
}

renderSiteContent().catch((error) => console.error(error));
renderMapping().catch((error) => console.error(error));
