import { openDB, type IDBPDatabase } from "idb";
import type { ExtractedSite, HistoryItem } from "@/types";

const DB_NAME = "SourceW";
const DB_VER = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VER, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("history")) {
          const h = db.createObjectStore("history", { keyPath: "id" });
          h.createIndex("timestamp", "timestamp");
          h.createIndex("url", "url");
        }
        if (!db.objectStoreNames.contains("sites")) {
          db.createObjectStore("sites", { keyPath: "url" });
        }
      },
    });
  }
  return dbPromise;
}

export async function idbSaveSite(site: ExtractedSite) {
  try {
    const db = await getDB();
    await db.put("sites", {
      url: site.url,
      html: site.html,
      css: site.css,
      js: site.js,
      resources: site.resources,
      meta: site.meta,
      stats: site.stats,
      savedAt: Date.now(),
    });
  } catch (e) {
    console.warn("idb save site failed", e);
  }
}

export async function idbGetSite(url: string): Promise<ExtractedSite | null> {
  try {
    const db = await getDB();
    const row = await db.get("sites", url);
    if (!row) return null;
    return {
      url: row.url,
      html: row.html,
      css: row.css,
      js: row.js,
      resources: row.resources || [],
      meta: row.meta || { title: "", description: "", favicon: "" },
      stats: row.stats,
    };
  } catch {
    return null;
  }
}

export async function idbSaveHistory(item: HistoryItem) {
  try {
    const db = await getDB();
    await db.put("history", item);
    // keep last 50
    const all = await db.getAllFromIndex("history", "timestamp");
    if (all.length > 50) {
      const toDelete = all.slice(0, all.length - 50);
      const tx = db.transaction("history", "readwrite");
      await Promise.all(toDelete.map((x) => tx.store.delete(x.id)));
      await tx.done;
    }
  } catch (e) {
    console.warn("idb history failed", e);
  }
}

export async function idbGetHistory(): Promise<HistoryItem[]> {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex("history", "timestamp");
    return all.reverse();
  } catch {
    return [];
  }
}

export async function idbClearAll() {
  try {
    const db = await getDB();
    await db.clear("history");
    await db.clear("sites");
  } catch {
    /* ignore */
  }
}
