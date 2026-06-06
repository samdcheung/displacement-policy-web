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
  const radius = size * 0.34;
  const countryRows = rows.filter((row) => row.country === country);
  const clusters = uniqueValues(rows, "cluster");
  const values = clusters.map((cluster) => {
    const clusterRows = countryRows.filter((row) => row.cluster === cluster);
    const average = clusterRows.reduce((sum, row) => sum + scoreValue[row.score], 0) / clusterRows.length;
    return average / 3;
  });

  context.clearRect(0, 0, size, size);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "#d5dbe1";
  context.fillStyle = "#61717a";
  context.font = "12px Segoe UI, Arial, sans-serif";
  context.textAlign = "center";

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
    const x = center + Math.cos(angle) * (radius + 36);
    const y = center + Math.sin(angle) * (radius + 36);
    context.beginPath();
    context.moveTo(center, center);
    context.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
    context.stroke();
    context.fillText(cluster.replace(" and ", " & "), x, y, 118);
  });

  context.beginPath();
  values.forEach((value, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
    const x = center + Math.cos(angle) * radius * value;
    const y = center + Math.sin(angle) * radius * value;
    index === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  });
  context.closePath();
  context.fillStyle = "rgba(21, 96, 130, 0.22)";
  context.strokeStyle = "#156082";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
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
            <h3>${cluster}</h3>
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
renderMonitor().catch((error) => console.error(error));
