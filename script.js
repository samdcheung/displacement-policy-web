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
    document.querySelector("[data-perspectives-list]")
  ].filter(Boolean);

  if (!targets.length) return;

  const content = await fetchJson("data/site-content.json");

  document.querySelectorAll("[data-featured-analysis]").forEach((container) => {
    const limit = Number(container.dataset.featuredLimit || content.featured_analysis.length);
    container.innerHTML = content.featured_analysis
      .slice(0, limit)
      .map(
        (item) => `
          <article class="content-card feature-module">
            <p class="publication-type">${item.tag} | ${item.date}</p>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <a class="button secondary" href="${item.link}">${item.button || "Read More"}</a>
          </article>
        `
      )
      .join("");
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

  document.querySelectorAll("[data-perspectives-list]").forEach((container) => {
    const limit = Number(container.dataset.perspectivesLimit || content.perspectives.length);
    container.innerHTML = [...content.perspectives]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit)
      .map(
        (note) => `
          <article class="content-card">
            <p class="publication-type">${note.topic} | ${formatNoteDate(note.date)}</p>
            <h3>${note.title}</h3>
            <p>${note.summary}</p>
          </article>
        `
      )
      .join("");
  });
}

const ratingOrder = { Low: 1, Medium: 2, High: 3 };

function ratingBadge(value, mode = "risk") {
  return `<span class="rating-badge ${mode}-${value.toLowerCase()}">${value}</span>`;
}

function averageRating(values) {
  const average = values.reduce((sum, value) => sum + ratingOrder[value], 0) / values.length;
  if (average >= 2.5) return "High";
  if (average >= 1.5) return "Medium";
  return "Low";
}

function invertRating(value) {
  return { Low: "High", Medium: "Medium", High: "Low" }[value];
}

function toTitleLabel(value) {
  return value
    .replaceAll("_", " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

async function renderMapping() {
  const root = document.querySelector("[data-mapping]");
  if (!root) return;

  const [countriesData, mappingData, fiscalData, infrastructureData, reformsData] = await Promise.all([
    fetchJson("data/countries.json"),
    fetchJson("data/mapping.json"),
    fetchJson("data/fiscal_architecture.json"),
    fetchJson("data/infrastructure_governance.json"),
    fetchJson("data/reform_pathways.json")
  ]);

  const countries = countriesData.countries;
  const faultLines = new Map(mappingData.fault_lines.map((item) => [item.country_id, item]));
  const fiscal = new Map(fiscalData.countries.map((item) => [item.country_id, item]));
  const infrastructure = new Map(infrastructureData.countries.map((item) => [item.country_id, item]));
  const reforms = new Map(reformsData.countries.map((item) => [item.country_id, item.priority_reforms]));
  const faultLineFields = ["categorical", "temporal", "territorial"];
  let sortKey = "country";
  let sortDirection = 1;
  let visibleCountries = countries;

  const enrichCountry = (country) => {
    const countryFaults = faultLines.get(country.id);
    const countryFiscal = fiscal.get(country.id);
    const countryInfrastructure = infrastructure.get(country.id);
    return {
      ...country,
      faults: countryFaults,
      fiscal: countryFiscal,
      infrastructure: countryInfrastructure,
      reforms: reforms.get(country.id),
      fiscal_rating: averageRating([
        { Humanitarian: "High", Project: "High", Contingency: "Medium", Baseline: "Low" }[countryFiscal.budget_integration],
        invertRating(countryFiscal.adaptive_systems.adaptive_social_protection),
        invertRating(countryFiscal.adaptive_systems.disaster_risk_financing),
        invertRating(countryFiscal.adaptive_systems.municipal_finance),
        invertRating(countryFiscal.adaptive_systems.climate_finance),
        countryFiscal.recurrent_fiscal_obligation_risk
      ]),
      infrastructure_rating: averageRating([
        invertRating(countryInfrastructure.safeguards),
        invertRating(countryInfrastructure.resettlement_systems),
        invertRating(countryInfrastructure.registry_integration),
        invertRating(countryInfrastructure.post_project_continuity)
      ])
    };
  };

  const records = countries.map(enrichCountry);

  function populateMappingFilters() {
    const filterValues = {
      region: [...new Set(countries.map((country) => country.region))].sort(),
      income_group: [...new Set(countries.map((country) => country.income_group))].sort(),
      displacement_type: [...new Set(countries.flatMap((country) => country.primary_displacement_types))].sort(),
      fault_line: ["Categorical", "Temporal", "Territorial"]
    };

    root.querySelectorAll("[data-mapping-filter]").forEach((select) => {
      filterValues[select.dataset.mappingFilter].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.append(option);
      });
      select.addEventListener("change", renderMappingViews);
    });
  }

  function getMappingFilters() {
    return [...root.querySelectorAll("[data-mapping-filter]")].reduce((filters, select) => {
      filters[select.dataset.mappingFilter] = select.value;
      return filters;
    }, {});
  }

  function applyMappingFilters() {
    const filters = getMappingFilters();
    visibleCountries = records.filter((record) => {
      const selectedFault = filters.fault_line.toLowerCase();
      return (
        (!filters.region || record.region === filters.region) &&
        (!filters.income_group || record.income_group === filters.income_group) &&
        (!filters.displacement_type || record.primary_displacement_types.includes(filters.displacement_type)) &&
        (!selectedFault || ratingOrder[record.faults[selectedFault]] >= ratingOrder.Medium)
      );
    });
  }

  function sortRecords(recordsToSort) {
    return [...recordsToSort].sort((a, b) => {
      const sortValue = (record) => {
        if (sortKey === "country") return record.country;
        if (sortKey === "fiscal") return ratingOrder[record.fiscal_rating];
        if (sortKey === "infrastructure") return ratingOrder[record.infrastructure_rating];
        return ratingOrder[record.faults[sortKey]];
      };
      const aValue = sortValue(a);
      const bValue = sortValue(b);
      if (typeof aValue === "string") return aValue.localeCompare(bValue) * sortDirection;
      return (aValue - bValue) * sortDirection;
    });
  }

  function renderComparisonTable() {
    const table = root.querySelector("[data-mapping-table]");
    table.innerHTML = sortRecords(visibleCountries)
      .map((record) => `
        <tr>
          <td><strong>${record.country}</strong><br><span class="muted-text">${record.income_group}</span></td>
          <td>${ratingBadge(record.faults.categorical)}</td>
          <td>${ratingBadge(record.faults.temporal)}</td>
          <td>${ratingBadge(record.faults.territorial)}</td>
          <td>${ratingBadge(record.fiscal_rating)}<br><span class="muted-text">${record.fiscal.budget_integration}</span></td>
          <td>${ratingBadge(record.infrastructure_rating)}</td>
          <td>${record.reforms[0].recommended_reform}</td>
        </tr>
      `)
      .join("");
  }

  function renderMatrix() {
    const matrix = root.querySelector("[data-mapping-matrix]");
    const columns = [
      ["categorical", "Categorical"],
      ["temporal", "Temporal"],
      ["territorial", "Territorial"],
      ["fiscal_rating", "Fiscal"],
      ["infrastructure_rating", "Infrastructure"]
    ];
    matrix.innerHTML = `
      <div class="matrix-row matrix-head">
        <span>Country</span>${columns.map(([, label]) => `<span>${label}</span>`).join("")}
      </div>
      ${sortRecords(visibleCountries).map((record) => `
        <div class="matrix-row">
          <strong>${record.country}</strong>
          ${columns.map(([key]) => {
            const value = key.endsWith("_rating") ? record[key] : record.faults[key];
            return `<span class="matrix-cell ${value.toLowerCase()}" title="${value}">${value}</span>`;
          }).join("")}
        </div>
      `).join("")}
    `;
  }

  function renderCountryLinks() {
    const links = root.querySelector("[data-country-links]");
    if (!links) return;
    links.innerHTML = sortRecords(visibleCountries)
      .map((record) => `<a href="#${record.id}">${record.country}</a>`)
      .join("");
  }

  function renderCountryProfiles() {
    const profiles = root.querySelector("[data-country-profiles]");
    profiles.innerHTML = sortRecords(visibleCountries)
      .map((record) => `
        <article class="mapping-profile" id="${record.id}">
          <div class="mapping-profile-heading">
            <div>
              <p class="eyebrow">${record.region}</p>
              <h3>${record.country}</h3>
            </div>
            <span>${record.income_group}</span>
          </div>

          <section>
            <h4>Overview</h4>
            <dl class="profile-facts">
              <div><dt>Population</dt><dd>${record.population}</dd></div>
              <div><dt>Primary Displacement Types</dt><dd>${record.primary_displacement_types.join(", ")}</dd></div>
            </dl>
          </section>

          <section>
            <h4>Governance Fault Lines</h4>
            <div class="diagnostic-grid">
              ${faultLineFields.map((key) => `
                <div>
                  <strong>${toTitleLabel(key)}</strong>
                  ${ratingBadge(record.faults[key])}
                  <p>${record.faults[`${key}_note`]}</p>
                </div>
              `).join("")}
            </div>
          </section>

          <section>
            <h4>Fiscal Architecture</h4>
            <p><strong>Budget Integration:</strong> ${record.fiscal.budget_integration}</p>
            <div class="diagnostic-grid">
              ${Object.entries(record.fiscal.adaptive_systems).map(([key, value]) => `
                <div><strong>${toTitleLabel(key)}</strong>${ratingBadge(value, "capacity")}</div>
              `).join("")}
            </div>
            <p><strong>Recurrent Fiscal Obligation Risk:</strong> ${ratingBadge(record.fiscal.recurrent_fiscal_obligation_risk)} ${record.fiscal.description}</p>
          </section>

          <section>
            <h4>Infrastructure Governance</h4>
            <div class="diagnostic-grid">
              ${["safeguards", "resettlement_systems", "registry_integration", "post_project_continuity"].map((key) => `
                <div><strong>${toTitleLabel(key)}</strong>${ratingBadge(record.infrastructure[key], "capacity")}</div>
              `).join("")}
            </div>
          </section>

          <section>
            <h4>Reform Pathways</h4>
            <div class="reform-list">
              ${record.reforms.map((reform, index) => `
                <article>
                  <span>Priority Reform ${index + 1}</span>
                  <h5>${reform.issue}</h5>
                  <p>${reform.recommended_reform}</p>
                  <p><strong>Counterpart:</strong> ${reform.likely_counterpart_institution}</p>
                  <p><strong>Feasibility:</strong> ${ratingBadge(reform.feasibility, "capacity")}</p>
                </article>
              `).join("")}
            </div>
          </section>
        </article>
      `)
      .join("");
  }

  function renderMappingViews() {
    applyMappingFilters();
    renderComparisonTable();
    renderMatrix();
    renderCountryLinks();
    renderCountryProfiles();
  }

  root.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextKey = button.dataset.sort;
      sortDirection = sortKey === nextKey ? sortDirection * -1 : 1;
      sortKey = nextKey;
      renderMappingViews();
    });
  });

  populateMappingFilters();
  renderMappingViews();
}

renderSiteContent().catch((error) => console.error(error));
renderMapping().catch((error) => console.error(error));
