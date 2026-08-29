import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { ExtractedSite } from "@/types";

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  saveAs(blob, filename);
}

export function downloadSingle(site: ExtractedSite) {
  const body =
    site.html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || site.html;
  const bundled = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${site.meta.title || "Source W Extract"}</title>
<!-- Extracted by Source W from ${site.url} -->
<style>
${site.css}
</style>
</head>
<body>
${body}
<script>
${site.js}
<\/script>
</body>
</html>`;
  downloadBlob(bundled, "sourcew-bundle.html", "text/html");
}

export async function downloadZip(site: ExtractedSite) {
  const zip = new JSZip();
  let domain = "site";
  try {
    domain = new URL(site.url).hostname.replace(/\./g, "-");
  } catch {
    /* keep */
  }

  zip.file("index.html", site.html);
  zip.file("styles.css", site.css);
  zip.file("script.js", site.js);
  zip.file(
    "README.txt",
    `Extracted by Source W\nURL: ${site.url}\nTitle: ${site.meta.title}\nTime: ${site.stats.timeMs}ms\nResources: ${site.stats.resourceCount}\n`
  );

  const resFolder = zip.folder("resources");
  if (resFolder) {
    site.resources.forEach((r, i) => {
      if (r.url.startsWith("http")) {
        resFolder.file(
          `${r.type}-${i + 1}.txt`,
          `${r.type}: ${r.url}\n`
        );
      }
    });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `sourcew-${domain}.zip`);
}
