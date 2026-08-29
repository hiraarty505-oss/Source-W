"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  const [use3d, setUse3d] = useState(false);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!reduced) setUse3d(true);
    const t1 = "Source W";
    const t2 = "Extract · Preview · Download";
    let i = 0;
    if (reduced) {
      setTitle(t1);
      setSub(t2);
    } else {
      const a = setInterval(() => {
        i++;
        setTitle(t1.slice(0, i));
        if (i >= t1.length) clearInterval(a);
      }, 50);
      setTimeout(() => {
        let j = 0;
        const b = setInterval(() => {
          j++;
          setSub(t2.slice(0, j));
          if (j >= t2.length) clearInterval(b);
        }, 30);
      }, 600);
    }
    const auto = setTimeout(() => enter(), 5000);
    return () => clearTimeout(auto);
  }, []);

  useEffect(() => {
    if (use3d || reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const mouse = { x: -9999, y: -9999 };
    const parts: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove);
    const N = Math.min(80, Math.floor((innerWidth * innerHeight) / 14000));
    for (let i = 0; i < N; i++) {
      parts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.4,
        o: Math.random() * 0.5 + 0.15,
      });
    }
    const loop = () => {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        const dx = p.x - mouse.x,
          dy = p.y - mouse.y,
          d = Math.hypot(dx, dy);
        if (d < 140 && d > 0) {
          const f = (140 - d) / 140;
          p.vx += (dx / d) * f * 0.3;
          p.vy += (dy / d) * f * 0.3;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.99;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${p.o})`;
        ctx.fill();
      }
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i],
            b = parts[j],
            d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(59,130,246,${0.12 * (1 - d / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [use3d, reduced]);

  function enter() {
    router.push("/dashboard");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") enter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {use3d && !reduced ? <Scene3D /> : <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />}
      <div className="relative z-10 px-6 text-center">
        <div className="mb-7 flex items-center justify-center gap-2 font-mono text-4xl font-light text-white/90 sm:text-5xl">
          <span className="text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">{"{"}</span>
          <span className="bg-gradient-to-br from-white to-indigo-300 bg-clip-text font-bold text-transparent">W</span>
          <span className="text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">{"}"}</span>
        </div>
        <h1 className="mb-3 min-h-[1.2em] text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mb-10 min-h-[1.5em] text-sm tracking-[0.2em] text-zinc-400 sm:text-base">{sub}</p>
        <button
          type="button"
          onClick={enter}
          className="rounded-full bg-white px-14 py-4 text-base font-bold text-zinc-950 shadow-lg transition hover:scale-105 active:scale-95"
        >
          Enter
        </button>
        <p className="mt-8 text-xs text-zinc-600">
          <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> skip · auto 5s
        </p>
      </div>
    </section>
  );
}
