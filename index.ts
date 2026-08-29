export type ResourceType =
  | "css"
  | "js"
  | "img"
  | "font"
  | "svg"
  | "video"
  | "audio"
  | "icon"
  | "link"
  | "meta"
  | "other";

export interface Resource {
  url: string;
  type: ResourceType;
  original?: string;
  content?: string;
  size?: number;
  mimeType?: string;
}

export interface ExtractedSite {
  url: string;
  html: string;
  css: string;
  js: string;
  resources: Resource[];
  meta: {
    title: string;
    description: string;
    favicon: string;
  };
  stats: {
    htmlSize: number;
    cssSize: number;
    jsSize: number;
    resourceCount: number;
    htmlLines: number;
    cssLines: number;
    jsLines: number;
    timeMs: number;
  };
}

export interface HistoryItem {
  id: string;
  url: string;
  domain: string;
  title?: string;
  timestamp: number;
  size?: number;
}

export interface AppSettings {
  theme: "auto" | "dark" | "light";
  wordWrap: boolean;
  lineNumbers: boolean;
  includeInlineStyles: boolean;
  includeInlineScripts: boolean;
  timeout: number;
}
