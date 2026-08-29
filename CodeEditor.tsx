"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center text-sm text-[var(--muted)]">
      Loading editor…
    </div>
  ),
});

type Props = {
  value: string;
  language: "html" | "css" | "javascript";
  theme: "dark" | "light";
  wordWrap?: boolean;
  height?: string;
};

export default function CodeEditor({
  value,
  language,
  theme,
  wordWrap = true,
  height = "420px",
}: Props) {
  const monacoTheme = theme === "dark" ? "vs-dark" : "light";
  const opts = useMemo(
    () => ({
      readOnly: true,
      fontSize: 13,
      fontFamily: "ui-monospace, SF Mono, Consolas, monospace",
      lineNumbers: "on" as const,
      minimap: { enabled: value.length < 100000 },
      scrollBeyondLastLine: false,
      wordWrap: wordWrap ? ("on" as const) : ("off" as const),
      automaticLayout: true,
      renderLineHighlight: "line" as const,
      bracketPairColorization: { enabled: true },
    }),
    [value.length, wordWrap]
  );

  return (
    <Monaco
      height={height}
      language={language}
      value={value}
      theme={monacoTheme}
      options={opts}
    />
  );
}
