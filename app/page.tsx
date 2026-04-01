"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  AnimatePresence,
  Variants,
} from "framer-motion";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ─────────────────────────────────────────────
// DESIGN TOKENS  (map to your tailwind config)
// ─────────────────────────────────────────────
// bg-background   → #080B10
// bg-surface      → #0E1219
// text-foreground → #F0F4FF
// text-muted      → #5A6580
// text-cyan       → #00E8D2

// ─────────────────────────────────────────────
// GLOBAL STYLES  (injected once via <style>)
// ─────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #080B10;
      --surface:   #0E1219;
      --fg:        #F0F4FF;
      --muted:     #8A95A5; /* Slightly lighter gray for Inter readability */
      --cyan:      #00E8D2;
      --violet:    #7C3AED;
      --cyan-20:   rgba(0,232,210,0.20);
      --cyan-08:   rgba(0,232,210,0.08);
      --violet-20: rgba(124,58,237,0.20);
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--fg);
      font-family: 'Inter', sans-serif;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    h1, h2, h3, h4 { font-family: 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.02em; }

    ::selection { background: var(--cyan-20); color: var(--fg); }

    /* scrollbar */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--cyan-20); border-radius: 99px; }

    /* Noise overlay */
    .noise::after {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
      opacity: 0.4;
      z-index: 9999;
    }

    /* Glass card */
    .glass {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(24px) saturate(1.6);
      -webkit-backdrop-filter: blur(24px) saturate(1.6);
      border: 1px solid rgba(255,255,255,0.07);
    }

    /* Neon glow helpers */
    .glow-cyan  { text-shadow: 0 0 40px rgba(0,232,210,0.55); }
    .shadow-cyan{ box-shadow: 0 0 40px rgba(0,232,210,0.18), 0 0 80px rgba(0,232,210,0.06); }

    /* Clip helper */
    .clip-hero {
      clip-path: polygon(0 0, 100% 0, 100% 90%, 50% 100%, 0 90%);
    }

    /* Marquee */
    @keyframes marquee-left {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    .marquee-track {
      display: flex;
      width: max-content;
      animation: marquee-left 34s linear infinite;
    }
    .marquee-track.paused { animation-play-state: paused; }

    /* Dashed border animation */
    @keyframes dash-spin {
      to { stroke-dashoffset: -200; }
    }

    /* Floating label */
    .field-wrap { position: relative; }
    .field-wrap input,
    .field-wrap textarea,
    .field-wrap select {
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.12);
      color: var(--fg);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9375rem;
      padding: 1.5rem 0 0.5rem;
      width: 100%;
      outline: none;
      transition: border-color 0.25s;
    }
    .field-wrap input:focus,
    .field-wrap textarea:focus,
    .field-wrap select:focus {
      border-bottom-color: var(--cyan);
    }
    .field-wrap select option { background: #0E1219; }
    .field-wrap textarea { resize: none; min-height: 110px; }
    .field-wrap label {
      position: absolute;
      top: 1.5rem;
      left: 0;
      color: var(--muted);
      font-size: 0.875rem;
      pointer-events: none;
      transition: 0.2s ease;
    }
    .field-wrap input:focus ~ label,
    .field-wrap input:not(:placeholder-shown) ~ label,
    .field-wrap textarea:focus ~ label,
    .field-wrap textarea:not(:placeholder-shown) ~ label,
    .field-wrap select:focus ~ label,
    .field-wrap select:valid ~ label {
      top: 0.25rem;
      font-size: 0.7rem;
      color: var(--cyan);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  `}</style>
);

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

// ─────────────────────────────────────────────
// SECTION 1 — HERO
// ─────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
}

function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particles.current = Array.from({ length: 80 }, (_, id) => ({
      id,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.5 + 0.1,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,232,210,${p.opacity})`;
        ctx.fill();
      }
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.6,
      }}
    />
  );
}

const HERO_WORDS = ["Attendance.", "Leave Policy.", "Payroll Intel.", "Accountability."];

function HeroSection() {
  const router = useRouter();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setWordIndex((i) => (i + 1) % HERO_WORDS.length),
      2200
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="clip-hero"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--bg)",
        paddingTop: 80,
      }}
    >
      {/* Ambient gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "10%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,232,210,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "0%",
          right: "-5%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      <HeroParticles />

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 3rem",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(8,11,16,0.7)",
        }}
      >
        <span
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            fontSize: "1.25rem",
            letterSpacing: "-0.02em",
            color: "var(--fg)",
          }}
        >
          Flow<span style={{ color: "var(--cyan)" }}>Space</span>
        </span>
        <div
          style={{
            display: "flex",
            gap: "2rem",
            fontSize: "0.85rem",
            color: "var(--muted)",
          }}
        >
          {["Product", "Pricing", "Enterprise", "Blog"].map((item) => (
            <motion.a
              key={item}
              href="#"
              whileHover={{ color: "var(--fg)" }}
              style={{
                color: "inherit",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              {item}
            </motion.a>
          ))}
        </div>
        <motion.button
          onClick={() => router.push("/login")}
          whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(0,232,210,0.35)" }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: "0.55rem 1.4rem",
            borderRadius: 6,
            border: "1px solid var(--cyan)",
            background: "transparent",
            color: "var(--cyan)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "0.03em",
          }}
        >
          Get Access
        </motion.button>
      </motion.nav>

      {/* Hero copy */}
      <div
        style={{
          textAlign: "center",
          position: "relative",
          zIndex: 2,
          maxWidth: 1000,
          padding: "0 2rem",
        }}
      >
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.4em" }}
          animate={{ opacity: 1, letterSpacing: "0.25em" }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            fontSize: "0.7rem",
            fontWeight: 500,
            color: "var(--cyan)",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
          }}
        >
          Enterprise SaaS · HR &amp; Operations Platform
        </motion.p>

        <div
          style={{
            fontSize: "clamp(3.5rem, 9vw, 8rem)",
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            marginBottom: "0.5rem",
          }}
        >
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            style={{ overflow: "hidden" }}
          >
            {"One Platform.".split(" ").map((w, i) => (
              <motion.span
                key={i}
                variants={fadeUp}
                custom={i}
                style={{ display: "inline-block", marginRight: "0.3em" }}
              >
                {w}
              </motion.span>
            ))}
          </motion.div>
        </div>

        <div
          style={{
            fontSize: "clamp(3.5rem, 9vw, 8rem)",
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            marginBottom: "2.5rem",
            height: "1.1em",
            overflow: "hidden",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={wordIndex}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "inline-block",
                color: "var(--cyan)",
              }}
              className="glow-cyan"
            >
              {HERO_WORDS[wordIndex]}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
          style={{
            maxWidth: 600,
            margin: "0 auto 3rem",
            color: "var(--muted)",
            fontSize: "1.15rem",
            lineHeight: 1.6,
          }}
        >
          Stop chasing timesheets. FlowSpace automatically tracks attendance, enforces leave policies via an intelligent consequence engine, and secures your payroll data—all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.7 }}
          style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}
        >
          <motion.button
            onClick={() => router.push("/login")}
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(0,232,210,0.4)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "0.85rem 2.2rem",
              borderRadius: 8,
              border: "none",
              background: "var(--cyan)",
              color: "#080B10",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
          >
            Start Free Trial
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, borderColor: "rgba(0,232,210,0.5)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "0.85rem 2.2rem",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "var(--fg)",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 400,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Watch Demo ↗
          </motion.button>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
        style={{
          position: "absolute",
          bottom: 60,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          color: "var(--muted)",
          fontSize: "0.7rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        <span>Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 1,
            height: 36,
            background: "linear-gradient(to bottom, var(--cyan), transparent)",
          }}
        />
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION 2 — APPLE-STYLE SCROLL SCRUBBER
// ─────────────────────────────────────────────
const SCROLL_FEATURES = [
  {
    title: "Automated Consequence Engine",
    body: "Define rule trees once. FlowSpace applies tiered penalties, warnings, and escalations automatically — no manual intervention ever.",
    align: "left",
    step: 0,
  },
  {
    title: "Live Attendance Grid",
    body: "A real-time heatmap of your entire workforce. Clock-ins, breaks, overtime, and anomalies surface instantly across every timezone.",
    align: "right",
    step: 1,
  },
  {
    title: "Predictive Absence Analytics",
    body: "Machine-learning models flag burnout patterns and predict absenteeism 14 days in advance, so you act before productivity dips.",
    align: "left",
    step: 2,
  },
  {
    title: "One-Click HR Dispatch",
    body: "Generate offer letters, warning notices, and policy updates in seconds. Legally-reviewed templates, custom-branded and instantly sent.",
    align: "right",
    step: 3,
  },
];

// Placeholder frames — replace with actual image paths
const FRAME_COUNT = 60;
const FRAME_PLACEHOLDERS = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/frames/frame_${String(i + 1).padStart(4, "0")}.jpg`
);

function ScrollScrubSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const frameIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, FRAME_COUNT - 1]
  );

  // Draw placeholder frames on canvas
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const unsub = frameIndex.on("change", (latest) => {
      const idx = Math.round(latest);
      const t = idx / (FRAME_COUNT - 1);

      // Placeholder: draw an animated gradient to simulate frames
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base gradient
      const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const hue1 = 180 + t * 60; // cyan → violet
      const hue2 = 270 - t * 40;
      grd.addColorStop(0, `hsla(${hue1},80%,18%,1)`);
      grd.addColorStop(1, `hsla(${hue2},70%,12%,1)`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated grid lines
      ctx.strokeStyle = `rgba(0,232,210,${0.06 + t * 0.08})`;
      ctx.lineWidth = 0.5;
      const cols = 12;
      for (let c = 0; c <= cols; c++) {
        const x = (canvas.width / cols) * c;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      const rows = 7;
      for (let r = 0; r <= rows; r++) {
        const y = (canvas.height / rows) * r;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Central "device" mockup
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const w = canvas.width * 0.55;
      const h = canvas.height * 0.6;
      const rx = 20;

      // Device glow
      ctx.shadowColor = "rgba(0,232,210,0.4)";
      ctx.shadowBlur = 80;
      ctx.fillStyle = "rgba(0,232,210,0.03)";
      roundRect(ctx, cx - w / 2, cy - h / 2, w, h, rx);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Device border
      ctx.strokeStyle = `rgba(0,232,210,${0.2 + t * 0.3})`;
      ctx.lineWidth = 1;
      roundRect(ctx, cx - w / 2, cy - h / 2, w, h, rx);
      ctx.stroke();

      // Screen bars (fake UI)
      const barY = cy - h / 2 + 40;
      const barW = w * 0.7;
      for (let b = 0; b < 5; b++) {
        const alpha = 0.08 + Math.sin(t * Math.PI * 2 + b) * 0.05;
        ctx.fillStyle = `rgba(0,232,210,${alpha})`;
        ctx.fillRect(cx - barW / 2, barY + b * 28, barW * (0.4 + (b % 3) * 0.2), 6);
      }

      // Progress indicator
      ctx.fillStyle = "var(--cyan)";
      ctx.fillStyle = `rgba(0,232,210,${0.6 + t * 0.4})`;
      ctx.beginPath();
      ctx.arc(cx, cy + h / 2 - 60, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    return unsub;
  }, [frameIndex]);

  // Active feature based on scroll
  const activeFeature = useTransform(scrollYProgress, (v) =>
    Math.min(Math.floor(v * SCROLL_FEATURES.length), SCROLL_FEATURES.length - 1)
  );
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => activeFeature.on("change", (v) => setActiveIdx(v)), [activeFeature]);

  return (
    <div
      ref={containerRef}
      style={{ height: "400vh", position: "relative" }}
    >
      {/* Sticky container */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        {/* Section label */}
        <motion.p
          style={{
            position: "absolute",
            top: 40,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "0.7rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Core Capabilities
        </motion.p>

        {/* Canvas frame scrubber */}
        <canvas
          ref={canvasRef}
          width={880}
          height={560}
          style={{
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.05)",
            maxWidth: "60vw",
            maxHeight: "65vh",
            width: "100%",
          }}
        />

        {/* Feature overlays */}
        {SCROLL_FEATURES.map((f, i) => (
          <AnimatePresence key={f.step}>
            {activeIdx === i && (
              <motion.div
                initial={{ opacity: 0, x: f.align === "left" ? -40 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: f.align === "left" ? -40 : 40 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "absolute",
                  [f.align]: "clamp(1rem, 4vw, 5rem)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  maxWidth: "min(320px, 22vw)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.65rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--cyan)",
                    marginBottom: "0.75rem",
                  }}
                >
                  0{i + 1} / 0{SCROLL_FEATURES.length}
                </p>
                <h3
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: "clamp(1.1rem, 2vw, 1.6rem)",
                    fontWeight: 700,
                    lineHeight: 1.2,
                    marginBottom: "0.75rem",
                    color: "var(--fg)",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--muted)",
                    lineHeight: 1.7,
                  }}
                >
                  {f.body}
                </p>

                {/* Accent line */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  style={{
                    marginTop: "1.2rem",
                    height: 1,
                    background: "linear-gradient(to right, var(--cyan), transparent)",
                    transformOrigin: f.align === "left" ? "left" : "right",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        ))}

        {/* Scroll progress bar */}
        <motion.div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            background: "var(--cyan)",
            scaleX: scrollYProgress,
            transformOrigin: "left",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─────────────────────────────────────────────
// SECTION 3 — TESTIMONIAL MARQUEE
// ─────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Priya Menon",
    role: "VP of People · Apeiro Labs",
    quote:
      "FlowSpace cut our manual HR overhead by 73%. The penalty engine alone saved us from three potential lawsuits.",
    avatar: "PM",
  },
  {
    name: "Tobias Krüger",
    role: "COO · Meridian Logistics",
    quote:
      "The live attendance grid changed how we manage shift compliance across 11 warehouses. Nothing else comes close.",
    avatar: "TK",
  },
  {
    name: "Fatima Al-Rashid",
    role: "HR Director · Nexova Systems",
    quote:
      "Onboarding is now a delight. Policies, contracts, digital signatures — everything flows inside one elegant interface.",
    avatar: "FA",
  },
  {
    name: "James Okafor",
    role: "CTO · Stride Financial",
    quote:
      "We integrated FlowSpace via REST in under a day. The developer experience is exceptional for an HR tool.",
    avatar: "JO",
  },
  {
    name: "Li Wei",
    role: "Head of Operations · Luminary Tech",
    quote:
      "Predictive absence analytics is legitimately magical. We adjusted schedules 10 days early last quarter.",
    avatar: "LW",
  },
  {
    name: "Sofia Reinholt",
    role: "People Lead · Aspen Studio",
    quote:
      "The UI is so well designed I actually look forward to running payroll reconciliation. I can't believe I'm saying that.",
    avatar: "SR",
  },
];

function TestimonialCard({
  t,
  onHover,
  onLeave,
  isHovered,
}: {
  t: (typeof TESTIMONIALS)[0];
  onHover: () => void;
  onLeave: () => void;
  isHovered: boolean;
}) {
  return (
    <motion.div
      onHoverStart={onHover}
      onHoverEnd={onLeave}
      animate={{
        scale: isHovered ? 1.035 : 1,
        borderColor: isHovered
          ? "rgba(0,232,210,0.5)"
          : "rgba(255,255,255,0.07)",
        boxShadow: isHovered
          ? "0 0 40px rgba(0,232,210,0.12), 0 0 80px rgba(0,232,210,0.04)"
          : "none",
      }}
      transition={{ duration: 0.3 }}
      className="glass"
      style={{
        borderRadius: 16,
        padding: "1.75rem",
        width: 340,
        flexShrink: 0,
        marginRight: "1.25rem",
        cursor: "default",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <p
        style={{
          fontSize: "0.95rem",
          lineHeight: 1.7,
          color: "var(--fg)",
          marginBottom: "1.4rem",
          fontStyle: "italic",
        }}
      >
        &ldquo;{t.quote}&rdquo;
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, var(--cyan-20), var(--violet-20))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--cyan)",
            border: "1px solid rgba(0,232,210,0.25)",
            flexShrink: 0,
          }}
        >
          {t.avatar}
        </div>
        <div>
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--fg)",
            }}
          >
            {t.name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {t.role}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialMarquee() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { data } = useSWR("/api/testimonials", fetcher, { fallbackData: { data: [] } });

  const testimonials = data?.data?.length > 0 ? data.data : TESTIMONIALS;
  const doubled = [...testimonials, ...testimonials];

  return (
    <section
      style={{
        padding: "8rem 0",
        overflow: "hidden",
        background: "var(--bg)",
        position: "relative",
      }}
    >
      {/* Header */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        style={{ textAlign: "center", marginBottom: "4rem", padding: "0 2rem" }}
      >
        <motion.p
          variants={fadeUp}
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--cyan)",
            marginBottom: "1rem",
          }}
        >
          Trusted Globally
        </motion.p>
        <motion.h2
          variants={fadeUp}
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--fg)",
          }}
        >
          Teams that move with clarity.
        </motion.h2>
      </motion.div>

      {/* Gradient fades */}
      <div
        style={{
          position: "absolute",
          zIndex: 2,
          background:
            "linear-gradient(to right, var(--bg) 0%, transparent 8%, transparent 92%, var(--bg) 100%)",
          pointerEvents: "none",
          inset: 0,
          bottom: "auto",
          height: 200,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />

      <div
        style={{ overflow: "hidden", cursor: "default", position: "relative" }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <div
          className={`marquee-track${hoveredIdx !== null ? " paused" : ""}`}
          style={{ alignItems: "stretch" }}
        >
          {doubled.map((t, i) => (
            <TestimonialCard
              key={i}
              t={t}
              onHover={() => setHoveredIdx(i)}
              onLeave={() => setHoveredIdx(null)}
              isHovered={hoveredIdx === i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────────
const STATS = [
  { value: "4,800+", label: "Companies" },
  { value: "1.2M", label: "Employees Managed" },
  { value: "99.97%", label: "Uptime SLA" },
  { value: "< 200ms", label: "API Response" },
];

function StatsBar() {
  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "1px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      {STATS.map((s) => (
        <motion.div
          key={s.label}
          variants={fadeUp}
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
            background: "var(--bg)",
          }}
        >
          <p
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              fontWeight: 800,
              color: "var(--cyan)",
              letterSpacing: "-0.03em",
              marginBottom: "0.35rem",
            }}
          >
            {s.value}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", letterSpacing: "0.05em" }}>
            {s.label}
          </p>
        </motion.div>
      ))}
    </motion.section>
  );
}

// ─────────────────────────────────────────────
// SECTION 4 — ENQUIRY FUNNEL
// ─────────────────────────────────────────────
function DashedButton({ children }: { children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.97 }}
      type="submit"
      style={{
        position: "relative",
        padding: "1rem 3rem",
        background: hovered ? "var(--cyan)" : "transparent",
        border: "none",
        color: hovered ? "#080B10" : "var(--cyan)",
        fontFamily: "Syne, sans-serif",
        fontWeight: 700,
        fontSize: "0.95rem",
        letterSpacing: "0.05em",
        cursor: "pointer",
        borderRadius: 8,
        transition: "background 0.3s, color 0.3s",
        overflow: "visible",
      }}
    >
      {/* SVG dashed border */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="7"
          fill="none"
          stroke={hovered ? "transparent" : "var(--cyan)"}
          strokeWidth="1.5"
          strokeDasharray="8 4"
          style={{
            animation: hovered ? "none" : "dash-spin 3s linear infinite",
            transition: "stroke 0.2s",
          }}
        />
      </svg>
      {children}
    </motion.button>
  );
}

function EnquirySection() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    company: "",
    team_size: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) setSent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="contact"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8rem 2rem",
        position: "relative",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* Background orbs */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          left: "0%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,232,210,0.09) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1100, width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>

        {/* Left copy */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p
            variants={fadeUp}
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "var(--cyan)",
              marginBottom: "1rem",
            }}
          >
            Enterprise Enquiry
          </motion.p>
          <motion.h2
            variants={fadeUp}
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: "1.5rem",
            }}
          >
            Let's build your
            <br />
            <span style={{ color: "var(--cyan)" }}>ideal workspace.</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            style={{
              color: "var(--muted)",
              fontSize: "1rem",
              lineHeight: 1.75,
              maxWidth: 380,
              marginBottom: "2.5rem",
            }}
          >
            Tell us about your team and we'll arrange a personalised demo with
            a solutions engineer within 24 hours.
          </motion.p>

          {/* Trust badges */}
          <motion.div variants={stagger} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {["SOC 2 Type II Certified", "GDPR & DPDP Compliant", "ISO 27001 Audited"].map((b) => (
              <motion.div
                key={b}
                variants={fadeUp}
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" stroke="rgba(0,232,210,0.5)" />
                  <path d="M4 7l2 2 4-4" stroke="var(--cyan)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{b}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right: glass form */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="glass shadow-cyan"
          style={{
            borderRadius: 20,
            padding: "2.75rem",
            position: "relative",
          }}
        >
          {/* Corner accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 80,
              height: 80,
              borderTop: "1px solid rgba(0,232,210,0.3)",
              borderRight: "1px solid rgba(0,232,210,0.3)",
              borderRadius: "0 20px 0 0",
              pointerEvents: "none",
            }}
          />

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", padding: "3rem 0" }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    border: "2px solid var(--cyan)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L20 7" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
                <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: "1.4rem", marginBottom: "0.75rem" }}>
                  We'll be in touch.
                </h3>
                <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                  Expect a response from our team within 24 hours.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div className="field-wrap">
                    <input type="text" placeholder=" " required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                    <label>Full Name</label>
                  </div>
                  <div className="field-wrap">
                    <input type="text" placeholder=" " required value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                    <label>Company</label>
                  </div>
                </div>

                <div className="field-wrap">
                  <select required value={formData.team_size} onChange={e => setFormData({ ...formData, team_size: e.target.value })}>
                    <option value="" disabled />
                    <option>1–25</option>
                    <option>26–100</option>
                    <option>101–500</option>
                    <option>501–2000</option>
                    <option>2000+</option>
                  </select>
                  <label>Team Size</label>
                </div>

                <div className="field-wrap">
                  <textarea placeholder=" " value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
                  <label>Message (optional)</label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <DashedButton>{loading ? "Sending..." : "Request Demo →"}</DashedButton>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "3rem 4rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1.5rem",
        background: "var(--surface)",
      }}
    >
      <span
        style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 800,
          fontSize: "1.1rem",
          letterSpacing: "-0.02em",
        }}
      >
        Flow<span style={{ color: "var(--cyan)" }}>Space</span>
      </span>
      <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
        © {new Date().getFullYear()} FlowSpace Inc. All rights reserved.
      </p>
      <div style={{ display: "flex", gap: "1.5rem" }}>
        {["Privacy", "Terms", "Security", "Status"].map((l) => (
          <a
            key={l}
            href="#"
            style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              textDecoration: "none",
            }}
          >
            {l}
          </a>
        ))}
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// PAGE ROOT
// ─────────────────────────────────────────────
export default function FlowSpaceLanding() {
  return (
    <>
      <GlobalStyles />
      <div className="noise">
        <HeroSection />
        <StatsBar />
        <ScrollScrubSection />
        <TestimonialMarquee />
        <EnquirySection />
        <Footer />
      </div>
    </>
  );
}