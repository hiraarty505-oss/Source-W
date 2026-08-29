import type { HistoryItem } from "@/types";

const HIST_KEY = "sw_history_v2";
const THEME_KEY = "sw_theme";
const INSTALL_KEY = "sw_install_dismissed";

export function getTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const t = localStorage.getItem(THEME_KEY);
  return t === "light" ? "light" : "dark";
}

export function setTheme(theme: "dark" | "light") {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function getHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveHistory(url: string, title?: string) {
  let domain = url;
  try {
    domain = new URL(url).hostname;
  } catch {
    /* keep */
  }
  let list = getHistory().filter((x) => x.url !== url);
  list.unshift({
    id: crypto.randomUUID(),
    url,
    domain,
    title,
    timestamp: Date.now(),
  });
  list = list.slice(0, 20);
  localStorage.setItem(HIST_KEY, JSON.stringify(list));
}

export function clearHistory() {
  localStorage.removeItem(HIST_KEY);
}

export function isInstallDismissed() {
  return localStorage.getItem(INSTALL_KEY) === "1";
}

export function dismissInstall() {
  localStorage.setItem(INSTALL_KEY, "1");
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
