const API = "";
const THEME_STORAGE_KEY = "transport-theme";
let dashboardChartInstances = [];

function cssColor(varName, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function destroyDashboardCharts() {
  dashboardChartInstances.forEach((c) => {
    try {
      c.destroy();
    } catch {
      /* ignore */
    }
  });
  dashboardChartInstances = [];
}

function badgeClassFor(column, raw) {
  const s = String(raw).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, "_");
  if (column === "statut") {
    if (/^actif$|^disponible$|^termine$|^termine_/.test(s) || s === "actif") return "badge--ok";
    if (/maintenance|planifie|planifi|conge|absent/.test(s)) return "badge--warn";
    if (/hors_service|indisponible|annul/.test(s)) return "badge--bad";
    if (/en_cours|^en_route$/.test(s)) return "badge--info";
    return "badge--neutral";
  }
  if (column === "gravite") {
    if (/faible/.test(s)) return "badge--ok";
    if (/moyen/.test(s)) return "badge--warn";
    if (/eleve|severe|critique/.test(s)) return "badge--bad";
    return "badge--neutral";
  }
  return "badge--neutral";
}

function renderTableCell(column, value) {
  if (value === null || value === undefined) {
    const span = document.createElement("span");
    span.className = "cell-empty";
    span.textContent = "—";
    return span;
  }
  const str = String(value);
  if (column === "statut" || column === "gravite") {
    const span = document.createElement("span");
    span.className = `badge ${badgeClassFor(column, str)}`;
    span.textContent = str.replace(/_/g, " ");
    return span;
  }
  return document.createTextNode(str);
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  const slider = document.querySelector("#themeToggle .theme-toggle-slider");
  if (slider) slider.textContent = theme === "light" ? "☀️" : "🌙";
  root.style.colorScheme = theme === "light" ? "light" : "dark";
  document.getElementById("themeToggle")?.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
}

function setupTheme() {
  let theme;
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") theme = saved;
  else theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  applyTheme(theme);

  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    applyTheme(isLight ? "dark" : "light");
    const dash = document.getElementById("panel-dashboard");
    if (dash?.classList.contains("active")) loadDashboard();
  });
}

function initDashboardCharts(stats) {
  if (typeof Chart === "undefined") return;

  const text = cssColor("--text", "#e8eef4");
  const muted = cssColor("--muted", "#8fa3b6");
  const accent = cssColor("--accent", "#3d9cf5");
  const success = cssColor("--success", "#34d399");
  const warning = cssColor("--warning", "#fbbf24");
  const danger = cssColor("--danger", "#f87171");
  const info = cssColor("--info", "#60a5fa");
  const border = cssColor("--border", "#2d3a47");
  const purple = cssColor("--purple", "#a78bfa");

  const font = getComputedStyle(document.documentElement).getPropertyValue("--font") || "system-ui, sans-serif";
  Chart.defaults.color = muted;
  Chart.defaults.borderColor = `${border}99`;
  Chart.defaults.font.family = font.split(",")[0].replace(/"/g, "").trim();

  const legendText = { labels: { color: text } };
  const gridColor = `${border}66`;

  const series = stats.trajets_par_jour && stats.trajets_par_jour.length ? stats.trajets_par_jour : [];
  const labelsJours = series.map((p) => {
    const d = new Date(`${p.date}T12:00:00`);
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  });
  const countsJours = series.map((p) => p.count);

  const elLine = document.getElementById("chartTrajetsSemaine");
  if (elLine) {
    const fill = Chart.helpers?.color?.(accent)?.alpha(0.2).rgbString() || `${accent}33`;
    dashboardChartInstances.push(
      new Chart(elLine, {
        type: "line",
        data: {
          labels: labelsJours,
          datasets: [
            {
              label: "Nombre de trajets",
              data: countsJours,
              tension: 0.35,
              fill: true,
              backgroundColor: fill,
              borderColor: accent,
              borderWidth: 2,
              pointBackgroundColor: accent,
              pointBorderColor: text,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: legendText },
          scales: {
            x: {
              ticks: { color: muted },
              grid: { color: gridColor },
            },
            y: {
              ticks: { color: muted, precision: 0 },
              grid: { color: gridColor },
              beginAtZero: true,
            },
          },
        },
      })
    );
  }

  const vAct = stats.vehicules?.actif ?? 0;
  const vMaint = stats.vehicules?.maintenance ?? 0;
  const vHors = stats.vehicules?.hors_service ?? 0;
  const elDonut = document.getElementById("chartDonutVehicules");
  if (elDonut && vAct + vMaint + vHors > 0) {
    dashboardChartInstances.push(
      new Chart(elDonut, {
        type: "doughnut",
        data: {
          labels: ["Actifs", "Maintenance", "Hors service"],
          datasets: [
            {
              data: [vAct, vMaint, vHors],
              backgroundColor: [success, warning, danger],
              borderWidth: 2,
              borderColor: cssColor("--surface", "#151b2e"),
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { ...legendText, position: "bottom" } },
        },
      })
    );
  }

  const tPlan = stats.trajets?.planifie ?? stats.trajets?.planifié ?? 0;
  const tEnc = stats.trajets?.en_cours ?? 0;
  const tTer = stats.trajets?.termine ?? stats.trajets?.terminé ?? 0;
  const elBar = document.getElementById("chartBarTrajets");
  if (elBar) {
    dashboardChartInstances.push(
      new Chart(elBar, {
        type: "bar",
        data: {
          labels: ["Planifiés", "En cours", "Terminés"],
          datasets: [
            {
              label: "Trajets",
              data: [tPlan, tEnc, tTer],
              backgroundColor: [info, accent, success],
              borderRadius: 8,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: muted }, grid: { display: false } },
            y: {
              ticks: { color: muted, precision: 0 },
              grid: { color: gridColor },
              beginAtZero: true,
            },
          },
        },
      })
    );
  }

  const gF = stats.incidents_gravite?.faible ?? 0;
  const gM = stats.incidents_gravite?.moyenne ?? stats.incidents_gravite?.moyen ?? 0;
  const gE = stats.incidents_gravite?.elevee ?? stats.incidents_gravite?.élevée ?? stats.incidents_gravite?.eleve ?? 0;
  const elPolar = document.getElementById("chartPolarIncidents");
  if (elPolar) {
    dashboardChartInstances.push(
      new Chart(elPolar, {
        type: "polarArea",
        data: {
          labels: ["Gravité faible", "Moyenne", "Élevée"],
          datasets: [
            {
              data: [gF, gM, gE],
              backgroundColor: [
                `${success}cc`,
                `${warning}cc`,
                `${danger}cc`,
              ],
              borderColor: [success, warning, danger],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { ...legendText, position: "right" } },
          scales: {
            r: {
              ticks: { color: muted, backdropColor: "transparent" },
              grid: { color: gridColor },
              pointLabels: { color: text },
              beginAtZero: true,
            },
          },
        },
      })
    );
  }

  const elStack = document.getElementById("chartStackedFleet");
  const chDisp = stats.chauffeurs?.disponible ?? 0;
  const chRoute = stats.chauffeurs?.en_route ?? 0;
  const chConge = stats.chauffeurs?.conge ?? stats.chauffeurs?.congé ?? 0;
  const chOther = Math.max(0, (stats.total_chauffeurs || 0) - chDisp - chRoute - chConge);
  if (elStack && (stats.total_chauffeurs || 0) > 0) {
    dashboardChartInstances.push(
      new Chart(elStack, {
        type: "bar",
        data: {
          labels: ["Chauffeurs"],
          datasets: [
            { label: "Disponibles", data: [chDisp], backgroundColor: success, stack: "s" },
            { label: "En route", data: [chRoute], backgroundColor: info, stack: "s" },
            { label: "Congé / autre", data: [chConge + chOther], backgroundColor: purple, stack: "s" },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { ...legendText, position: "top" } },
          scales: {
            x: {
              stacked: true,
              ticks: { color: muted, precision: 0 },
              grid: { color: gridColor },
              max: stats.total_chauffeurs || undefined,
            },
            y: { stacked: true, ticks: { color: muted }, grid: { display: false } },
          },
        },
      })
    );
  }
}

async function fetchJson(path, options) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options && options.headers),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text || "Réponse invalide" };
  }
  if (!res.ok) {
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((d) => d.msg || d).join(" ")
          : res.statusText;
    throw new Error(msg || `Erreur ${res.status}`);
  }
  return data;
}

function elTable(rows) {
  if (!rows || !rows.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Aucune donnée.";
    return p;
  }
  const cols = Object.keys(rows[0]);
  const table = document.createElement("table");
  table.className = "data";
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  for (const c of cols) {
    const th = document.createElement("th");
    th.textContent = c;
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const c of cols) {
      const td = document.createElement("td");
      td.appendChild(renderTableCell(c, row[c]));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function setLoading(container) {
  container.innerHTML = "";
  const p = document.createElement("p");
  p.className = "loading";
  p.textContent = "Chargement…";
  container.appendChild(p);
}

async function loadSection(name, endpoint, containerId) {
  const container = document.getElementById(containerId);
  setLoading(container);
  try {
    const data = await fetchJson(endpoint);
    container.innerHTML = "";
    container.appendChild(elTable(data));
  } catch (e) {
    container.innerHTML = "";
    const p = document.createElement("p");
    p.className = "error";
    p.textContent = e.message;
    container.appendChild(p);
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.dataset.tab;
      tabs.forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      panels.forEach((p) => {
        const match = p.id === `panel-${id}`;
        p.classList.toggle("active", match);
        p.hidden = !match;
      });
      if (id === "dashboard") loadDashboard();
      if (id === "vehicules") loadSection("v", "/api/vehicules", "table-vehicules");
      if (id === "chauffeurs") loadSection("c", "/api/chauffeurs", "table-chauffeurs");
      if (id === "lignes") loadSection("l", "/api/lignes", "table-lignes");
      if (id === "trajets") loadSection("t", "/api/trajets", "table-trajets");
      if (id === "tarifs") loadSection("ta", "/api/tarifs", "table-tarifs");
      if (id === "incidents") loadSection("i", "/api/incidents", "table-incidents");
    });
  });
}

async function loadDashboard() {
  const container = document.getElementById("dashboard-content");
  container.innerHTML = '<div class="loading">Chargement des statistiques...</div>';
  
  try {
    const stats = await fetchJson("/api/dashboard");
    destroyDashboardCharts();

    const totalVehicules = stats.total_vehicules || 0;
    const totalChauffeurs = stats.total_chauffeurs || 0;
    const actifs = stats.vehicules?.actif || 0;
    const disponibles = stats.chauffeurs?.disponible || 0;
    const tPlan = stats.trajets?.planifie || 0;
    const tEnc = stats.trajets?.en_cours || 0;
    const tTer = stats.trajets?.termine || 0;
    const tSum = tPlan + tEnc + tTer;
    const tripFlowPct = tSum > 0 ? Math.round((tTer / tSum) * 100) : 0;
    const incF = stats.incidents_gravite?.faible || 0;
    const incM = stats.incidents_gravite?.moyenne || 0;
    const incE = stats.incidents_gravite?.elevee || 0;
    const incSum = incF + incM + incE || 1;

    const vehiculesProgress = totalVehicules > 0 ? Math.round((actifs / totalVehicules) * 100) : 0;
    const chauffeursProgress = totalChauffeurs > 0 ? Math.round((disponibles / totalChauffeurs) * 100) : 0;

    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card kpi-primary">
          <div class="kpi-header">
            <div class="kpi-icon">🚌</div>
            <div class="kpi-trend">↗ ${vehiculesProgress}%</div>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">${totalVehicules}</div>
            <div class="kpi-label">Véhicules Total</div>
            <div class="kpi-detail">
              ${actifs} actifs · ${stats.vehicules?.maintenance || 0} maintenance · ${stats.vehicules?.hors_service || 0} hors service
            </div>
            <div class="kpi-progress">
              <div class="kpi-progress-bar" style="width: ${vehiculesProgress}%"></div>
            </div>
          </div>
        </div>
        
        <div class="kpi-card kpi-success">
          <div class="kpi-header">
            <div class="kpi-icon">👥</div>
            <div class="kpi-trend">↗ ${chauffeursProgress}%</div>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">${totalChauffeurs}</div>
            <div class="kpi-label">Chauffeurs Total</div>
            <div class="kpi-detail">
              ${disponibles} disponibles · ${stats.chauffeurs?.en_route || 0} en route · ${stats.chauffeurs?.conge || 0} en congé
            </div>
            <div class="kpi-progress">
              <div class="kpi-progress-bar" style="width: ${chauffeursProgress}%"></div>
            </div>
          </div>
        </div>
        
        <div class="kpi-card kpi-info">
          <div class="kpi-header">
            <div class="kpi-icon">🚦</div>
            <div class="kpi-trend">↗ +${stats.trajets_semaine || 0}</div>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">${stats.trajets_semaine || 0}</div>
            <div class="kpi-label">Trajets cette semaine</div>
            <div class="kpi-detail">
              ${tEnc} en cours · ${tTer} terminés · ${tPlan} planifiés
            </div>
            <div class="kpi-progress">
              <div class="kpi-progress-bar" style="width: ${tripFlowPct}%"></div>
            </div>
          </div>
        </div>
        
        <div class="kpi-card kpi-warning">
          <div class="kpi-header">
            <div class="kpi-icon">⚠️</div>
            <div class="kpi-trend ${stats.incidents_mois > 5 ? 'down' : ''}">
              ${stats.incidents_mois > 5 ? '↓' : '↗'} ${stats.incidents_mois || 0}
            </div>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">${stats.incidents_mois || 0}</div>
            <div class="kpi-label">Incidents ce mois</div>
            <div class="kpi-detail">
              ${stats.incidents_gravite?.faible || 0} faibles · ${stats.incidents_gravite?.moyenne || 0} moyens · ${stats.incidents_gravite?.elevee || 0} élevés
            </div>
            <div class="kpi-progress">
              <div class="kpi-progress-bar" style="width: ${Math.min((stats.incidents_mois || 0) * 10, 100)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="charts-section">
        <h3 class="section-title">📉 Visualisations</h3>
        <p class="section-lead">Courbes, diagrammes et répartition des données en temps réel</p>
        <div class="charts-grid">
          <div class="chart-card chart-card--wide">
            <h4>Trajets sur 7 jours</h4>
            <p class="chart-sub">Volume quotidien (date de départ)</p>
            <div class="chart-wrap chart-wrap--tall"><canvas id="chartTrajetsSemaine" aria-label="Graphique des trajets"></canvas></div>
          </div>
          <div class="chart-card">
            <h4>Flotte par statut</h4>
            <p class="chart-sub">Véhicules</p>
            <div class="chart-wrap"><canvas id="chartDonutVehicules" aria-label="Camembert véhicules"></canvas></div>
          </div>
          <div class="chart-card">
            <h4>Trajets par statut</h4>
            <p class="chart-sub">Vue globale</p>
            <div class="chart-wrap"><canvas id="chartBarTrajets" aria-label="Histogramme trajets"></canvas></div>
          </div>
          <div class="chart-card">
            <h4>Incidents</h4>
            <p class="chart-sub">Par gravité</p>
            <div class="chart-wrap"><canvas id="chartPolarIncidents" aria-label="Diagramme polar incidents"></canvas></div>
          </div>
          <div class="chart-card">
            <h4>Chauffeurs</h4>
            <p class="chart-sub">Disponibilité agrégée</p>
            <div class="chart-wrap chart-wrap--short"><canvas id="chartStackedFleet" aria-label="Barres chauffeurs"></canvas></div>
          </div>
        </div>
      </div>
      
      <div class="stats-section">
        <h3>📈 Statistiques détaillées</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <h4>🚌 Véhicules par statut</h4>
            <div class="stat-list">
              <div class="stat-item">
                <span class="stat-label">🟢 Actifs</span>
                <span class="stat-value">${actifs}</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill success" style="width: ${totalVehicules > 0 ? (actifs / totalVehicules * 100) : 0}%"></div>
              </div>
              
              <div class="stat-item">
                <span class="stat-label">🟡 Maintenance</span>
                <span class="stat-value">${stats.vehicules?.maintenance || 0}</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill warning" style="width: ${totalVehicules > 0 ? ((stats.vehicules?.maintenance || 0) / totalVehicules * 100) : 0}%"></div>
              </div>
              
              <div class="stat-item">
                <span class="stat-label">🔴 Hors service</span>
                <span class="stat-value">${stats.vehicules?.hors_service || 0}</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill danger" style="width: ${totalVehicules > 0 ? ((stats.vehicules?.hors_service || 0) / totalVehicules * 100) : 0}%"></div>
              </div>
            </div>
          </div>
          
          <div class="stat-card">
            <h4>🚦 Trajets par statut</h4>
            <div class="stat-list">
              <div class="stat-item">
                <span class="stat-label">📅 Planifiés</span>
                <span class="stat-value">${tPlan}</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill info" style="width: ${tSum > 0 ? (tPlan / tSum) * 100 : 0}%"></div>
              </div>
              
              <div class="stat-item">
                <span class="stat-label">🚀 En cours</span>
                <span class="stat-value">${tEnc}</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill primary" style="width: ${tSum > 0 ? (tEnc / tSum) * 100 : 0}%"></div>
              </div>
              
              <div class="stat-item">
                <span class="stat-label">✅ Terminés</span>
                <span class="stat-value">${tTer}</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill success" style="width: ${tSum > 0 ? (tTer / tSum) * 100 : 0}%"></div>
              </div>
            </div>
          </div>
          
          <div class="stat-card">
            <h4>⚠️ Incidents par gravité</h4>
            <div class="stat-list">
              <div class="stat-item">
                <span class="stat-label">🟢 Faibles</span>
                <span class="stat-value">${incF}</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill success" style="width: ${(incF / incSum) * 100}%"></div>
              </div>
              
              <div class="stat-item">
                <span class="stat-label">🟡 Moyens</span>
                <span class="stat-value">${incM}</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill warning" style="width: ${(incM / incSum) * 100}%"></div>
              </div>
              
              <div class="stat-item">
                <span class="stat-label">🔴 Élevés</span>
                <span class="stat-value">${incE}</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill danger" style="width: ${(incE / incSum) * 100}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    requestAnimationFrame(() => initDashboardCharts(stats));
  } catch (e) {
    container.innerHTML = `<div class="error">Erreur lors du chargement du tableau de bord: ${e.message}</div>`;
  }
}

function setupChat() {
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const submit = document.getElementById("chatSubmit");
  const err = document.getElementById("chatError");
  const answerEl = document.getElementById("chatAnswer");
  const tableWrap = document.getElementById("chatTableWrap");
  const tableHost = document.getElementById("chatTable");
  const sqlPre = document.getElementById("chatSql");
  const resultTitle = document.getElementById("chatResultTitle");

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    err.hidden = true;
    answerEl.hidden = true;
    tableWrap.hidden = true;
    tableHost.innerHTML = "";
    sqlPre.textContent = "";
    if (resultTitle) resultTitle.textContent = "Résultats";

    const message = input.value.trim();
    if (!message) return;

    submit.disabled = true;
    submit.textContent = "Réponse…";
    try {
      const data = await fetchJson("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      answerEl.textContent = data.answer;
      answerEl.hidden = false;
      sqlPre.textContent = data.sql || "";
      const rows = data.rows || [];
      const n = rows.length;
      if (resultTitle) {
        resultTitle.textContent =
          n === 0 ? "Résultats (0 ligne)" : `Résultats (${n} ligne${n > 1 ? "s" : ""})`;
      }
      tableHost.appendChild(elTable(rows));
      tableWrap.hidden = false;
      tableWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = "Envoyer";
    }
  });
}

async function pingApi() {
  const status = document.getElementById("apiStatus");
  try {
    await fetchJson("/api/health");
    status.textContent = "API connectée";
    status.classList.add("ok");
    status.classList.remove("err");
  } catch (e) {
    status.textContent = "API indisponible";
    status.classList.add("err");
    status.classList.remove("ok");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.protocol === "file:") {
    const w = document.getElementById("fileOpenWarning");
    if (w) w.hidden = false;
  }
  setupTheme();
  setupTabs();
  setupChat();
  pingApi();
  loadDashboard();
});
