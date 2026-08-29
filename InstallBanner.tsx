"use client";

import { useEffect, useState } from "react";
import { dismissInstall, isInstallDismissed } from "@/lib/storage";

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isInstallDismissed()) return;
    const handler = (e: Event) => {
      e.preventDefault();
      const pe = e as unknown as { prompt: () => Promise<void> };
      setPrompt(pe);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || !prompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-w-lg items-center gap-3 border-t border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 font-mono text-sm font-bold text-white">
        W
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold">Install Source W</div>
        <div className="text-xs text-[var(--muted)]">Quick access from home screen</div>
      </div>
      <button
        type="button"
        className="btn-primary h-9 px-3 text-sm"
        onClick={async () => {
          await prompt.prompt();
          setShow(false);
          dismissInstall();
        }}
      >
        Install
      </button>
      <button
        type="button"
        className="text-sm text-[var(--muted)]"
        onClick={() => {
          setShow(false);
          dismissInstall();
        }}
      >
        Not now
      </button>
    </div>
  );
}
