// popup.js

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setBadge(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = `badge badge-${type}`;
}

function setStatus(icon, title, url, cardClass) {
  document.getElementById("status-card").className = `status-card ${cardClass}`;
  document.querySelector(".status-icon").textContent = icon;
  document.querySelector(".status-text h2").textContent = title;
  document.getElementById("current-url").textContent =
    url.length > 45 ? url.slice(0, 42) + "…" : url;
}

function renderResult(url, result) {
  document.getElementById("details").style.display = "flex";
  document.getElementById("recheck-btn").style.display = "block";

  if (result.skipped) {
    setStatus("ℹ️", "URL não verificável", url, "status-skipped");
    setBadge("gsb-badge", "Ignorado", "loading");
    setBadge("vt-badge", "Ignorado", "loading");
    document.getElementById("gsb-sub").textContent = "Apenas http/https são verificados";
    document.getElementById("vt-sub").textContent = "—";
    return;
  }

  // Google Safe Browsing
  if (result.google?.error) {
    setBadge("gsb-badge", "Erro", "error");
    document.getElementById("gsb-sub").textContent = result.google.error;
  } else if (result.google?.safe) {
    setBadge("gsb-badge", "Seguro", "safe");
    document.getElementById("gsb-sub").textContent = "Nenhuma ameaça detectada";
  } else {
    const threats = result.google?.threats?.map(t => t.type.replace(/_/g, " ")).join(", ");
    setBadge("gsb-badge", "Perigo!", "danger");
    document.getElementById("gsb-sub").textContent = threats || "Ameaça detectada";
  }

  // VirusTotal
  if (result.virustotal?.error) {
    setBadge("vt-badge", "Erro", "error");
    document.getElementById("vt-sub").textContent = result.virustotal.error;
  } else if (result.virustotal?.safe) {
    setBadge("vt-badge", "Seguro", "safe");
    const stats = result.virustotal.stats;
    const total = result.virustotal.totalEngines;
    document.getElementById("vt-sub").textContent =
      total ? `0/${total} engines detectaram ameaça` : "Nenhuma ameaça";
  } else {
    const m = result.virustotal?.maliciousCount;
    const t = result.virustotal?.totalEngines;
    setBadge("vt-badge", "Perigo!", "danger");
    document.getElementById("vt-sub").textContent = `${m}/${t} engines detectaram ameaça`;
  }

  // VirusTotal link
  if (result.virustotal?.permalink) {
    const link = document.getElementById("vt-link");
    link.href = result.virustotal.permalink;
    link.style.display = "block";
  }

  // Overall status
  if (!result.safe) {
    setStatus("🚨", "URL Perigosa!", url, "status-danger");
  } else {
    setStatus("✅", "URL Segura", url, "status-safe");
  }
}

async function checkCurrentTab() {
  const tab = await getCurrentTab();
  if (!tab?.url) return;

  const url = tab.url;
  setStatus("⏳", "Verificando...", url, "status-loading");
  document.getElementById("details").style.display = "none";
  document.getElementById("vt-link").style.display = "none";
  document.getElementById("recheck-btn").style.display = "none";

  chrome.runtime.sendMessage({ type: "CHECK_URL", url }, (result) => {
    if (chrome.runtime.lastError || !result) {
      setStatus("❌", "Erro ao verificar", url, "status-loading");
      return;
    }
    renderResult(url, result);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  checkCurrentTab();

  document.getElementById("recheck-btn")?.addEventListener("click", checkCurrentTab);
});
