let allRows = [];
let uniqueIndustries = [];
let uniqueCounties = [];
let industryChartInstance = null;
let countyChartInstance = null;

Papa.parse("./data/processed_wage_theft_data.csv", {
  download: true,
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  complete: function (results) {
    allRows = results.data
      .map(cleanRow)
      .filter((row) => row.companyId && row.company && row.industry && row.county);

    uniqueIndustries = extractUniqueIndustries(allRows);
    uniqueCounties = extractUniqueCounties(allRows);
    
    // Filter out "Other" before slicing the top 8
    const top8Industries = uniqueIndustries.filter(item => item.industry.toLowerCase() !== 'other').slice(0, 8);
    buildIndustryChart(top8Industries);
    
    const top8Counties = uniqueCounties.slice(0, 8);
    buildCountyChart(top8Counties);

    const companyId = getCompanyIdFromUrl();
    const selectedRow = allRows.find((row) => row.companyId === companyId);

    if (!companyId || !selectedRow) {
      renderNotFound(companyId);
      return;
    }

    renderCaseCard(selectedRow);
    renderIndustryCard(selectedRow);
  }   
});

function getCompanyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("company") || "").trim().toLowerCase();
}

function cleanRow(row) {
  return {
    companyId: String(row["company_id"] ?? "").trim().toLowerCase(),
    company: String(row["Company name"] ?? "").trim(),
    city: String(row["City"] ?? "").trim(),
    county: String(row["County"] ?? "").trim(),
    zip: String(row["Zip code"] ?? "").trim(),
    date: String(row["Date"] ?? "").trim(),
    claimants: Number(row["Claimants"] ?? 0),
    wagesOwed: Number(row["Wages owed"] ?? 0),
    industry: String(row["Industry_clean"] ?? "").trim(),

    industryStolen: Number(row["industry_stolen"] ?? 0),
    industryTotalClaimants: Number(row["industry_total_claimants"] ?? 0),
    industryAvgLossPerWorker: Number(row["industry_avg_loss_per_worker"] ?? 0),

    companyTotalWages: Number(row["company_total_wages"] ?? 0),
    companyTotalClaimants: Number(row["company_total_claimants"] ?? 0),
    companyAvgLossPerWorker: Number(row["company_avg_loss_per_worker"] ?? 0),

    countyTotalWages: Number(row["county_total_wages"] ?? 0),
    countyTotalCases: Number(row["county_total_cases"] ?? 0)
  };
}

function renderCaseCard(row) {
  const fakeWorkerName = generateWorkerName(row.company);
  const card = document.getElementById("caseCard");

  card.innerHTML = `
    <h3 class="wt-card-title">${escapeHtml(fakeWorkerName)} at ${escapeHtml(row.company)}</h3>
    <p class="wt-card-subtitle">
      ${escapeHtml(row.city)}, ${escapeHtml(row.county)} County
      ${row.date ? `• ${escapeHtml(row.date)}` : ""}
    </p>

    <div class="wt-stats-grid">
      <div class="wt-stat-box">
        <span class="wt-stat-label">Total stolen at company</span>
        <div class="wt-stat-value">${formatCurrency(row.companyTotalWages)}</div>
      </div>

      <div class="wt-stat-box">
        <span class="wt-stat-label">Total claimants at company</span>
        <div class="wt-stat-value">${formatNumber(row.companyTotalClaimants)}</div>
      </div>

      <div class="wt-stat-box">
        <span class="wt-stat-label">Average loss per worker</span>
        <div class="wt-stat-value">${formatCurrency(row.companyAvgLossPerWorker)}</div>
      </div>
    </div>
  `;
}

function renderIndustryCard(row) {
  const card = document.getElementById("industryCard");

  card.innerHTML = `
    <h3 class="wt-card-title">${escapeHtml(row.industry)}</h3>
    <p class="wt-card-subtitle">
      The selected company belongs to this industry.
    </p>

    <div class="wt-stats-grid">
      <div class="wt-stat-box">
        <span class="wt-stat-label">Total stolen in industry</span>
        <div class="wt-stat-value">${formatCurrency(row.industryStolen)}</div>
      </div>

      <div class="wt-stat-box">
        <span class="wt-stat-label">Total claimants in industry</span>
        <div class="wt-stat-value">${formatNumber(row.industryTotalClaimants)}</div>
      </div>

      <div class="wt-stat-box">
        <span class="wt-stat-label">Average loss per worker</span>
        <div class="wt-stat-value">${formatCurrency(row.industryAvgLossPerWorker)}</div>
      </div>
    </div>
  `;
}

function renderNotFound(companyId) {
  const caseCard = document.getElementById("caseCard");
  const industryCard = document.getElementById("industryCard");

  caseCard.innerHTML = `
    <div class="wt-error-box">
      <strong>Company not found.</strong><br>
      ${
        companyId
          ? `No record matched the company id <code>${escapeHtml(companyId)}</code>.`
          : `No company id was provided in the page URL.`
      }
    </div>
  `;

  industryCard.innerHTML = `
    <div class="wt-error-box">
      This page expects a URL like:
      <br><br>
      <code>wage-theft.html?company=acme-construction</code>
    </div>
  `;
}

function renderLoadError() {
  const caseCard = document.getElementById("caseCard");
  const industryCard = document.getElementById("industryCard");

  caseCard.innerHTML = `
    <div class="wt-error-box">
      <strong>Data failed to load.</strong><br>
      Check that the CSV path is correct and that GitHub Pages is serving the file.
    </div>
  `;

  industryCard.innerHTML = "";
}

function extractUniqueIndustries(rows) {
  const map = new Map();

  rows.forEach((row) => {
    if (!map.has(row.industry)) {
      map.set(row.industry, {
        industry: row.industry,
        industryStolen: row.industryStolen,
        industryTotalClaimants: row.industryTotalClaimants,
        industryAvgLossPerWorker: row.industryAvgLossPerWorker
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.industryStolen - a.industryStolen);
}

function extractUniqueCounties(rows) {
  const map = new Map();

  rows.forEach((row) => {
    if (!map.has(row.county)) {
      map.set(row.county, {
        county: row.county,
        countyTotalWages: row.countyTotalWages,
        countyTotalCases: row.countyTotalCases
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.countyTotalWages - a.countyTotalWages);
}

function buildIndustryCheckboxes(industryData) {
  const container = document.getElementById("industryCheckboxes");
  container.innerHTML = "";

  industryData.forEach((item, index) => {
    const label = document.createElement("label");
    label.className = "wt-checkbox-pill";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = item.industry;
    input.checked = index < 8;

    input.addEventListener("change", () => {
      buildIndustryChart(getCheckedIndustries());
    });

    label.appendChild(input);
    label.appendChild(document.createTextNode(item.industry));
    container.appendChild(label);
  });
}

function getCheckedIndustries() {
  const checked = Array.from(
    document.querySelectorAll("#industryCheckboxes input:checked")
  ).map((el) => el.value);

  return uniqueIndustries.filter((item) => checked.includes(item.industry));
}

function buildIndustryChart(data) {
  const ctx = document.getElementById("industryChart");

  if (industryChartInstance) {
    industryChartInstance.destroy();
  }

  industryChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((d) => d.industry),
      datasets: [
        {
          label: "Total Wages Stolen",
          data: data.map((d) => d.industryStolen),
          backgroundColor: "#3b82f6", // A solid professional blue
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allows the chart to fill the container better
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => ` ${formatCurrency(context.raw)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => shortCurrency(value)
          }
        }
      }
    }
  });
}

function buildCountyChart(counties) {
  const ctx = document.getElementById("countyChart");
  const topCounties = counties.slice(0, 12);

  if (countyChartInstance) {
    countyChartInstance.destroy();
  }

  countyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: topCounties.map((c) => c.county),
      datasets: [
        {
          label: "Total Wages Stolen by County",
          data: topCounties.map((c) => c.countyTotalWages)
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return ` ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              return shortCurrency(value);
            }
          }
        }
      }
    }
  });
}

function generateWorkerName(companyName) {
  const firstNames = ["Maria", "James", "Ana", "David", "Sofia", "Luis", "Elena", "Daniel"];
  const lastInitials = ["R.", "M.", "T.", "G.", "L.", "C.", "P.", "S."];

  let seed = 0;
  for (let i = 0; i < companyName.length; i++) {
    seed += companyName.charCodeAt(i);
  }

  const first = firstNames[seed % firstNames.length];
  const last = lastInitials[seed % lastInitials.length];
  return `${first} ${last}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
}

function shortCurrency(value) {
  const num = Number(value || 0);

  if (num >= 1_000_000) {
    return "$" + (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return "$" + (num / 1_000).toFixed(0) + "K";
  }
  return "$" + num.toLocaleString("en-US");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}