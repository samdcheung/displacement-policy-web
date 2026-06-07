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
    document.querySelector("[data-notes-list]"),
    document.querySelector("[data-research-progress]")
  ].filter(Boolean);

  if (!targets.length) return;

  const content = await fetchJson("data/site-content.json");

  document.querySelectorAll("[data-featured-analysis]").forEach((container) => {
    container.innerHTML = content.featured_analysis
      .map(
        (item) => `
          <article class="content-card">
            <p class="publication-type">${item.tag} | ${item.date}</p>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <a class="text-link" href="${item.link}">Read more</a>
          </article>
        `
      )
      .join("");
  });

  const publicationList = document.querySelector("[data-publications-list]");
  if (publicationList) {
    publicationList.innerHTML = content.publications
      .map(
        (item) => `
          <article class="publication-row">
            <div>
              <p class="publication-type">${item.date}</p>
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

  document.querySelectorAll("[data-notes-list]").forEach((container) => {
    const limit = Number(container.dataset.notesLimit || content.notes.length);
    container.innerHTML = [...content.notes]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit)
      .map(
        (note) => `
          <article class="content-card">
            <p class="publication-type">${formatNoteDate(note.date)}</p>
            <h3>${note.title}</h3>
            <p>${note.summary}</p>
          </article>
        `
      )
      .join("");
  });

  document.querySelectorAll("[data-research-progress]").forEach((container) => {
    container.innerHTML = content.research_in_progress.map((item) => `<span>${item}</span>`).join("");
  });
}

const scoreValue = { red: 1, amber: 2, green: 3 };

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]))].sort();
}

function populateSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function scorePill(score) {
  return `<span class="score-pill ${score}"><span></span>${score}</span>`;
}

function rowHasJudgement(row) {
  return row.source_type === "judgement" || /judgement|expert|not usually explicit|limited/i.test(row.note);
}

function toCsv(rows) {
  const headers = ["country", "cluster", "indicator", "value", "score", "confidence", "source_type", "note", "last_updated"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function downloadCsv(rows) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "displacement-governance-monitor-v0.1.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function drawRadar(canvas, rows, country) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radius = size * 0.3;
  const countryRows = rows.filter((row) => row.country === country);
  const clusters = uniqueValues(rows, "cluster");
  const chartLabels = {
    "Legal and policy framework": "Legal",
    "Social protection coverage": "Social protection",
    "Fiscal architecture": "Fiscal",
    "Development finance and displacement risk pricing": "Finance"
  };
  const values = clusters.map((cluster) => {
    const clusterRows = countryRows.filter((row) => row.cluster === cluster);
    const average = clusterRows.reduce((sum, row) => sum + scoreValue[row.score], 0) / clusterRows.length;
    return average / 3;
  });

  context.clearRect(0, 0, size, size);
  context.fillStyle = "#fafbfb";
  context.fillRect(0, 0, size, size);
  context.lineWidth = 1;
  context.strokeStyle = "rgba(154, 168, 179, 0.5)";
  context.fillStyle = "#53636b";
  context.font = "600 12px Segoe UI, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let ring = 1; ring <= 3; ring += 1) {
    context.beginPath();
    clusters.forEach((_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / clusters.length;
      const pointRadius = (radius * ring) / 3;
      const x = center + Math.cos(angle) * pointRadius;
      const y = center + Math.sin(angle) * pointRadius;
      index === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
    });
    context.closePath();
    context.stroke();
  }

  clusters.forEach((cluster, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / clusters.length;
    const labelRadius = radius + 34;
    const x = center + Math.cos(angle) * labelRadius;
    const y = center + Math.sin(angle) * labelRadius;
    context.beginPath();
    context.moveTo(center, center);
    context.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
    context.stroke();
    context.fillText(chartLabels[cluster] || cluster, x, y);
  });

  context.beginPath();
  values.forEach((value, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
    const x = center + Math.cos(angle) * radius * value;
    const y = center + Math.sin(angle) * radius * value;
    index === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  });
  context.closePath();
  context.fillStyle = "rgba(21, 96, 130, 0.16)";
  context.strokeStyle = "#104a64";
  context.lineWidth = 2;
  context.fill();
  context.stroke();

  values.forEach((value, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
    const x = center + Math.cos(angle) * radius * value;
    const y = center + Math.sin(angle) * radius * value;
    context.beginPath();
    context.arc(x, y, 3.5, 0, Math.PI * 2);
    context.fillStyle = "#104a64";
    context.fill();
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

async function renderMonitor() {
  const root = document.querySelector("[data-monitor]");
  if (!root) return;

  const [dataset, rubric] = await Promise.all([
    fetchJson("data/monitor.json"),
    fetchJson("data/scoring-rubric.json")
  ]);
  const rows = dataset.rows;
  let filteredRows = rows;

  const meta = root.querySelector("[data-monitor-meta]");
  meta.innerHTML = `
    <p class="publication-type">${dataset.metadata.status} | Version ${dataset.metadata.version} | ${dataset.metadata.date}</p>
    <h2>${dataset.metadata.dataset_name}</h2>
    <p>${dataset.metadata.description}</p>
  `;

  root.querySelector("[data-rubric]").innerHTML = Object.entries(rubric)
    .map(([score, item]) => `<div>${scorePill(score)}<p>${item.description}</p></div>`)
    .join("");

  root.querySelectorAll("[data-filter]").forEach((select) => {
    populateSelect(select, uniqueValues(rows, select.dataset.filter));
    select.addEventListener("change", renderTable);
  });

  const profileCountry = root.querySelector("[data-profile-country]");
  populateSelect(profileCountry, uniqueValues(rows, "country"));
  profileCountry.addEventListener("change", () => renderProfile(profileCountry.value));

  root.querySelector("[data-download-csv]").addEventListener("click", () => downloadCsv(filteredRows));

  function getFilters() {
    return [...root.querySelectorAll("[data-filter]")].reduce((filters, select) => {
      filters[select.dataset.filter] = select.value;
      return filters;
    }, {});
  }

  function renderTable() {
    const filters = getFilters();
    filteredRows = rows.filter((row) =>
      Object.entries(filters).every(([key, value]) => !value || row[key] === value)
    );

    root.querySelector("[data-table-count]").textContent = `${filteredRows.length} indicator rows shown.`;
    root.querySelector("[data-monitor-table]").innerHTML = filteredRows
      .map(
        (row) => `
          <tr>
            <td>${row.country}</td>
            <td>${row.cluster}</td>
            <td>${row.indicator}</td>
            <td>${row.value}</td>
            <td>${scorePill(row.score)}</td>
            <td>${row.confidence}</td>
            <td>${row.source_type}${rowHasJudgement(row) ? ' <span class="judgement-mark" title="Judgement-based or partly judgement-based cell">judgement</span>' : ""}</td>
            <td>${row.note}</td>
            <td>${row.last_updated}</td>
          </tr>
        `
      )
      .join("");
  }

  function renderProfile(country) {
    const canvas = root.querySelector("[data-radar]");
    const summary = root.querySelector("[data-profile-summary]");
    const countryRows = rows.filter((row) => row.country === country);
    const clusters = uniqueValues(rows, "cluster");
    drawRadar(canvas, rows, country);
    summary.innerHTML = clusters
      .map((cluster) => {
        const clusterRows = countryRows.filter((row) => row.cluster === cluster);
        const counts = clusterRows.reduce((acc, row) => {
          acc[row.score] += 1;
          return acc;
        }, { green: 0, amber: 0, red: 0 });
        return `
          <article class="profile-cluster">
            <h3>${titleCase(cluster)}</h3>
            <p>${counts.green} green, ${counts.amber} amber, ${counts.red} red indicators.</p>
          </article>
        `;
      })
      .join("");
  }

  renderTable();
  profileCountry.value = uniqueValues(rows, "country")[0];
  renderProfile(profileCountry.value);
}

renderSiteContent().catch((error) => console.error(error));
renderMapping().catch((error) => console.error(error));
renderMonitor().catch((error) => console.error(error));
