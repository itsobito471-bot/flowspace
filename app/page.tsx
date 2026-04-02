"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  Variants,
} from "framer-motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── ANIMATION VARIANTS ───────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
  }),
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
function GlobalStyles({ light }: { light: boolean }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body {
        font-family: 'Inter', sans-serif;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
        background: ${light ? "#F8FAFC" : "#080B10"};
        color: ${light ? "#0F172A" : "#F0F4FF"};
        transition: background 0.4s, color 0.4s;
      }
      h1,h2,h3,h4 { font-family:'Plus Jakarta Sans',sans-serif; letter-spacing:-0.02em; }
      ::selection { background: rgba(0,232,210,0.2); }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: ${light ? "#e2e8f0" : "#080B10"}; }
      ::-webkit-scrollbar-thumb { background: rgba(0,232,210,0.3); border-radius: 99px; }

      @keyframes marquee-left { from { transform:translateX(0); } to { transform:translateX(-50%); } }
      .marquee-track { display:flex; width:max-content; animation:marquee-left 38s linear infinite; }
      .marquee-track.paused { animation-play-state:paused; }

      @keyframes float { 0%,100%{transform:translateY(0) rotate(0deg);} 33%{transform:translateY(-12px) rotate(1.5deg);} 66%{transform:translateY(6px) rotate(-1deg);} }

      @keyframes dash-border { to { stroke-dashoffset: -200; } }

      /* Nav responsive */
      .nav-links { display:flex; gap:2rem; font-size:0.83rem; }
      @media (max-width: 767px) {
        .nav-links { display:none !important; }
        .nav-get-access-label { display:none !important; }
        .nav-get-access-icon { display:inline !important; }
        .nav-root { padding: 0.9rem 1.25rem !important; }
      }

      .field-wrap { position:relative; }
      .field-wrap input, .field-wrap textarea, .field-wrap select {
        background:transparent; border:none;
        border-bottom:1px solid ${light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)"};
        color:${light ? "#0F172A" : "#F0F4FF"};
        font-family:'Inter',sans-serif; font-size:0.9375rem;
        padding:1.5rem 0 0.5rem; width:100%; outline:none; transition:border-color 0.25s;
      }
      .field-wrap input:focus, .field-wrap textarea:focus, .field-wrap select:focus {
        border-bottom-color:${light ? "#0284C7" : "#00E8D2"};
      }
      .field-wrap select option { background:${light ? "#F8FAFC" : "#0E1219"}; }
      .field-wrap textarea { resize:none; min-height:100px; }
      .field-wrap label {
        position:absolute; top:1.5rem; left:0;
        color:${light ? "#64748b" : "#8A95A5"};
        font-size:0.875rem; pointer-events:none; transition:0.2s ease;
      }
      .field-wrap input:focus~label, .field-wrap input:not(:placeholder-shown)~label,
      .field-wrap textarea:focus~label, .field-wrap textarea:not(:placeholder-shown)~label,
      .field-wrap select:focus~label, .field-wrap select:valid~label {
        top:0.25rem; font-size:0.68rem;
        color:${light ? "#0284C7" : "#00E8D2"};
        letter-spacing:0.08em; text-transform:uppercase;
      }

      /* Modal backdrop */
      .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(8px); z-index:900; display:flex; align-items:center; justify-content:center; padding:1rem; }
    `}</style>
  );
}

// ─── 3D GLASS MONOLITH ASSET ─────────────────────────────────────────────────
function GlassMonolith({ light, isMobile }: { light: boolean; isMobile: boolean }) {
  const accent = light ? "#0284C7" : "#00E8D2";
  const accentAlt = light ? "#7c3aed" : "#7c3aed";
  const glowColor = light ? "rgba(2,132,199,0.25)" : "rgba(0,232,210,0.35)";
  const size = isMobile ? 140 : 220;

  return (
    <svg width={size} height={size * 1.55} viewBox="0 0 220 340" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: "float 6s ease-in-out infinite", filter: `drop-shadow(0 0 40px ${glowColor}) drop-shadow(0 0 80px ${glowColor})` }}>
      <defs>
        <linearGradient id="monolithGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
          <stop offset="100%" stopColor={accentAlt} stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="50%" stopColor={accentAlt} stopOpacity="0.6" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="40%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="blur4">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {/* Shadow/glow base */}
      <ellipse cx="110" cy="320" rx="60" ry="10" fill={accent} opacity="0.2" filter="url(#blur4)" />
      {/* Main monolith body */}
      <rect x="35" y="20" width="150" height="290" rx="18" fill="url(#monolithGrad)" />
      <rect x="35" y="20" width="150" height="290" rx="18" stroke="url(#edgeGrad)" strokeWidth="1.2" />
      {/* Shine overlay */}
      <rect x="35" y="20" width="150" height="290" rx="18" fill="url(#shineGrad)" />
      {/* Inner lines — UI mockup */}
      {[60, 90, 115, 135, 155, 175, 200, 220, 240, 262].map((y, i) => (
        <rect key={y} x={55} y={y} width={[100, 70, 90, 55, 80, 65, 95, 45, 72, 60][i]} height="5" rx="2.5" fill={accent} opacity={0.12 + i * 0.022} />
      ))}
      {/* Accent dot cluster */}
      <circle cx="110" cy="48" r="5" fill={accent} opacity="0.4" />
      <circle cx="122" cy="48" r="3" fill={accentAlt} opacity="0.35" />
      <circle cx="98" cy="48" r="3" fill={accentAlt} opacity="0.3" />
      {/* Top edge highlight */}
      <path d="M53 20 Q110 14 167 20" stroke={accent} strokeWidth="1" strokeOpacity="0.6" fill="none" />
    </svg>
  );
}

// ─── HERO WORD CYCLER ─────────────────────────────────────────────────────────
const HERO_WORDS = ["Attendance.", "Leave Policy.", "Payroll Intel.", "Accountability."];

// ─── TESTIMONIAL MODAL ────────────────────────────────────────────────────────
function TestimonialModal({ onClose, light }: { onClose: () => void; light: boolean }) {
  const [form, setForm] = useState({ name: "", role: "", quote: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const accent = light ? "#0284C7" : "#00E8D2";
  const surface = light ? "#ffffff" : "#0E1219";
  const border = light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const muted = light ? "#64748b" : "#8A95A5";
  const fg = light ? "#0F172A" : "#F0F4FF";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, role: form.role, quote: form.quote, avatar: form.name.substring(0, 2).toUpperCase() }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 2200);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: surface,
          border: `1px solid ${border}`,
          borderRadius: 20,
          padding: "2.5rem",
          width: "100%",
          maxWidth: 480,
          position: "relative",
          backdropFilter: "blur(24px)",
          boxShadow: `0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px ${light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"}`,
        }}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", color: muted, fontSize: "1.25rem", cursor: "pointer", lineHeight: 1 }}>✕</button>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "2rem 0" }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 22 }}
                style={{ width: 60, height: 60, borderRadius: "50%", border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11l5 5L18 6" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </motion.div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: "1.25rem", color: fg, marginBottom: "0.5rem" }}>Thank you!</h3>
              <p style={{ color: muted, fontSize: "0.9rem" }}>Your testimonial is pending review.</p>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: "1.25rem", color: fg, marginBottom: "0.25rem" }}>Share your experience</h3>
                <p style={{ color: muted, fontSize: "0.85rem" }}>Your review will appear after approval.</p>
              </div>
              <div className="field-wrap"><input type="text" placeholder=" " required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><label>Full Name</label></div>
              <div className="field-wrap"><input type="text" placeholder=" " required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /><label>Role &amp; Company</label></div>
              <div className="field-wrap"><textarea placeholder=" " required value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })} /><label>Your Quote</label></div>
              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ padding: "0.9rem", borderRadius: 10, border: "none", background: accent, color: light ? "#fff" : "#080B10", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                {loading ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></svg>
                ) : "Submit Testimonial →"}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── TESTIMONIAL MARQUEE ──────────────────────────────────────────────────────
const STATIC_TESTIMONIALS = [
  { name: "Priya Menon", role: "VP of People · Apeiro Labs", quote: "FlowSpace cut our manual HR overhead by 73%. The penalty engine alone saved us from three potential lawsuits.", avatar: "PM" },
  { name: "Tobias Krüger", role: "COO · Meridian Logistics", quote: "The live attendance grid changed how we manage shift compliance across 11 warehouses. Nothing else comes close.", avatar: "TK" },
  { name: "Fatima Al-Rashid", role: "HR Director · Nexova Systems", quote: "Onboarding is now a delight. Policies, contracts, digital signatures — everything flows inside one elegant interface.", avatar: "FA" },
  { name: "James Okafor", role: "CTO · Stride Financial", quote: "We integrated FlowSpace via REST in under a day. The developer experience is exceptional for an HR tool.", avatar: "JO" },
  { name: "Li Wei", role: "Head of Operations · Luminary Tech", quote: "Predictive absence analytics is legitimately magical. We adjusted schedules 10 days early last quarter.", avatar: "LW" },
  { name: "Sofia Reinholt", role: "People Lead · Aspen Studio", quote: "The UI is so well designed I actually look forward to running payroll reconciliation. I can't believe I'm saying that.", avatar: "SR" },
];

function TestimonialCard({ t, light, isHovered, onHover, onLeave }: { t: any; light: boolean; isHovered: boolean; onHover: () => void; onLeave: () => void }) {
  const accent = light ? "#0284C7" : "#00E8D2";
  const fg = light ? "#0F172A" : "#F0F4FF";
  const muted = light ? "#64748b" : "#8A95A5";
  const cardBg = light ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)";
  const cardBorder = light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)";

  return (
    <motion.div
      onHoverStart={onHover} onHoverEnd={onLeave}
      animate={{ scale: isHovered ? 1.03 : 1, borderColor: isHovered ? accent : cardBorder, boxShadow: isHovered ? `0 0 32px ${accent}22` : "none" }}
      transition={{ duration: 0.25 }}
      style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "1.75rem", width: 340, flexShrink: 0, marginRight: "1.25rem", backdropFilter: "blur(12px)" }}
    >
      <p style={{ fontSize: "0.92rem", lineHeight: 1.7, color: fg, marginBottom: "1.25rem", fontStyle: "italic" }}>&ldquo;{t.quote}&rdquo;</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}30, #7c3aed30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: accent, border: `1px solid ${accent}40`, flexShrink: 0 }}>{t.avatar}</div>
        <div>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: fg }}>{t.name}</p>
          <p style={{ fontSize: "0.72rem", color: muted }}>{t.role}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "4,800+", label: "Companies" },
  { value: "1.2M", label: "Employees Managed" },
  { value: "99.97%", label: "Uptime SLA" },
  { value: "< 200ms", label: "API Response" },
];

// ─── FEATURES ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { title: "Automated Consequence Engine", body: "Define rule trees once. FlowSpace applies tiered penalties, warnings, and escalations automatically — no manual intervention ever." },
  { title: "Live Attendance Grid", body: "A real-time heatmap of your entire workforce. Clock-ins, breaks, overtime, and anomalies surface instantly across every timezone." },
  { title: "Predictive Absence Analytics", body: "ML models flag burnout patterns and predict absenteeism 14 days in advance, so you act before productivity dips." },
  { title: "One-Click HR Dispatch", body: "Generate offer letters, warning notices, and policy updates in seconds. Legally-reviewed templates, custom-branded and instantly sent." },
];

// ─── ENQUIRY FORM ─────────────────────────────────────────────────────────────
function EnquiryForm({ light }: { light: boolean }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", email: "", company: "", team_size: "", message: "" });
  const accent = light ? "#0284C7" : "#00E8D2";
  const fg = light ? "#0F172A" : "#F0F4FF";
  const muted = light ? "#64748b" : "#8A95A5";
  const surface = light ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)";
  const border = light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (res.ok) setSent(true);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, padding: "2.75rem", backdropFilter: "blur(20px)", position: "relative", boxShadow: `0 0 60px ${accent}12` }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderTop: `1px solid ${accent}50`, borderRight: `1px solid ${accent}50`, borderRadius: "0 20px 0 0" }} />

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="s" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "3rem 0" }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} style={{ width: 60, height: 60, borderRadius: "50%", border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11l5 5L18 6" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </motion.div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: "1.3rem", color: fg, marginBottom: "0.5rem" }}>We'll be in touch.</h3>
            <p style={{ color: muted, fontSize: "0.88rem" }}>Expect a response within 24 hours.</p>
          </motion.div>
        ) : (
          <motion.form key="f" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.6rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="field-wrap"><input type="text" placeholder=" " required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} /><label>Full Name</label></div>
              <div className="field-wrap"><input type="email" placeholder=" " required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /><label>Email</label></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="field-wrap"><input type="text" placeholder=" " required value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} /><label>Company</label></div>
              <div className="field-wrap">
                <select required value={formData.team_size} onChange={e => setFormData({ ...formData, team_size: e.target.value })}>
                  <option value="" disabled />
                  {["1–25", "26–100", "101–500", "501–2000", "2000+"].map(o => <option key={o}>{o}</option>)}
                </select>
                <label>Team Size</label>
              </div>
            </div>
            <div className="field-wrap"><textarea placeholder=" " value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} /><label>Message (optional)</label></div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ padding: "0.9rem 2.2rem", borderRadius: 8, border: `1.5px solid ${accent}`, background: "transparent", color: accent, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: "0.93rem", cursor: loading ? "wait" : "pointer" }}>
                {loading ? "Sending..." : "Request Demo →"}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── PAGE ROOT ────────────────────────────────────────────────────────────────
export default function FlowSpaceLanding() {
  const router = useRouter();
  const [light, setLight] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [hoveredTestimonialIdx, setHoveredTestimonialIdx] = useState<number | null>(null);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: pageRef, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 18 });

  // ── Scroll-driven asset transforms ──
  // x/y use vw/vh strings so movement is relative to the VIEWPORT, not the element.
  // Hero      (0–0.12):  center screen, large
  // Stats     (0.12–0.28): slide to far RIGHT (+28vw)
  // Features  (0.28–0.60): anchor on LEFT side (-26vw)
  // Fade-out  (0.60–1):  drift back to center then away
  const assetX = useTransform(smoothProgress,
    [0,      0.12,     0.22,     0.28,     0.58,     0.68,  1   ],
    isMobile
      ? ["0vw",  "0vw",  "0vw",  "0vw",  "0vw",  "0vw",  "0vw"]
      : ["0vw",  "0vw",  "28vw", "28vw", "-26vw", "-26vw", "0vw"]
  );
  const assetY = useTransform(smoothProgress,
    [0,      0.28,    0.60,    1    ],
    isMobile
      ? ["0vh",  "-5vh",  "-5vh",  "-5vh"]
      : ["0vh",  "5vh",   "8vh",   "5vh"]
  );
  const assetScale = useTransform(smoothProgress,
    [0,    0.12, 0.22,  0.28,  0.58,  0.68, 1   ],
    isMobile ? [0.65, 0.5,  0.5,   0.5,   0.45,  0.35, 0.3]
             : [1,    1,    0.72,  0.72,  0.82,  0.45, 0.3]
  );
  const assetOpacity = useTransform(smoothProgress,
    [0,    0.08,  0.60,  0.72, 1  ],
    isMobile ? [0.13, 0.1,  0.08,  0.04, 0]
             : [1,    1,    0.92,  0.28, 0]
  );
  const assetRotate = useTransform(smoothProgress,
    [0, 0.22, 0.28, 0.60, 1],
    [0,  4,   -8,    3,   6]
  );

  // colors
  const bg = light ? "#F8FAFC" : "#080B10";
  const fg = light ? "#0F172A" : "#F0F4FF";
  const accent = light ? "#0284C7" : "#00E8D2";
  const muted = light ? "#64748b" : "#8A95A5";
  const surfaceBg = light ? "#ffffff" : "#0E1219";
  const border = light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";

  const { data: testimonialData } = useSWR("/api/testimonials", fetcher, { fallbackData: { data: [] } });
  const testimonials = testimonialData?.data?.length > 0 ? testimonialData.data : STATIC_TESTIMONIALS;
  const doubled = [...testimonials, ...testimonials];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setWordIndex(i => (i + 1) % HERO_WORDS.length), 2300);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsub = smoothProgress.on("change", v => {
      if (v >= 0.28 && v < 0.60) {
        const t = (v - 0.28) / 0.32;
        setActiveFeature(Math.min(Math.floor(t * FEATURES.length), FEATURES.length - 1));
      }
    });
    return unsub;
  }, [smoothProgress]);

  return (
    <>
      <GlobalStyles light={light} />

      {/* ── Fixed floating asset ── */}
      <motion.div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          translateX: "-50%",
          translateY: "-50%",
          x: assetX,
          y: assetY,
          scale: assetScale,
          opacity: assetOpacity,
          rotate: assetRotate,
          zIndex: isMobile ? 1 : 5,
          pointerEvents: "none",
        }}
      >
        <GlassMonolith light={light} isMobile={isMobile} />
      </motion.div>

      {/* ── Fixed Nav ── */}
      <motion.nav
        className="nav-root"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.1rem 2.5rem",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${border}`,
          background: light ? "rgba(248,250,252,0.82)" : "rgba(8,11,16,0.8)",
          transition: "background 0.4s",
        }}
      >
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.02em", color: fg }}>
          Flow<span style={{ color: accent }}>Space</span>
        </span>

        {/* Nav links — hidden on mobile via CSS class */}
        <div className="nav-links" style={{ color: muted }}>
          {["Product", "Pricing", "Enterprise"].map(item => (
            <a key={item} href="#" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = fg)}
              onMouseLeave={e => (e.currentTarget.style.color = muted)}>
              {item}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* Theme toggle — always visible */}
          <motion.button
            onClick={() => setLight(l => !l)}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            style={{ background: "none", border: `1px solid ${border}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: muted, transition: "border-color 0.3s, color 0.3s", flexShrink: 0 }}
            aria-label="Toggle theme"
          >
            {light ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            )}
          </motion.button>

          <motion.button
            onClick={() => router.push("/login")}
            whileHover={{ scale: 1.04, boxShadow: `0 0 20px ${accent}55` }} whileTap={{ scale: 0.97 }}
            style={{ padding: "0.5rem 1.3rem", borderRadius: 7, border: `1px solid ${accent}`, background: "transparent", color: accent, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.83rem", fontWeight: 600, cursor: "pointer", transition: "box-shadow 0.3s", whiteSpace: "nowrap" }}
          >
            <span className="nav-get-access-label">Get Access</span>
            <span style={{ display: "none" }} className="nav-get-access-icon">→</span>
          </motion.button>
        </div>
      </motion.nav>

      {/* ── Scroll progress bar ── */}
      <motion.div
        style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: accent, scaleX: scrollYProgress, transformOrigin: "left", zIndex: 200, opacity: 0.7 }}
      />

      {/* ── Page content ── */}
      <div ref={pageRef} style={{ background: bg, color: fg, transition: "background 0.4s, color 0.4s" }}>

        {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
        <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 72, paddingBottom: "6rem", position: "relative", overflow: "hidden", textAlign: "center" }}>
          {/* Ambient orbs */}
          <div style={{ position: "absolute", top: "-15%", left: "5%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${accent}14 0%, transparent 70%)`, filter: "blur(70px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "0", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none" }} />

          <motion.div variants={stagger} initial="hidden" animate="visible" style={{ position: "relative", zIndex: 2, maxWidth: 900, padding: "0 2rem" }}>
            <motion.p variants={fadeUp} style={{ fontSize: "0.68rem", fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.28em", marginBottom: "1.5rem" }}>
              Enterprise SaaS · HR &amp; Operations Platform
            </motion.p>
            <motion.div variants={fadeUp} style={{ fontSize: "clamp(3rem, 9vw, 7.5rem)", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", marginBottom: "0.4rem" }}>
              One Platform.
            </motion.div>
            <div style={{ fontSize: "clamp(3rem, 9vw, 7.5rem)", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", marginBottom: "2.5rem", height: "1.1em", overflow: "hidden" }}>
              <AnimatePresence mode="wait">
                <motion.span key={wordIndex} initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ display: "inline-block", color: accent }}>
                  {HERO_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </div>

            <motion.p variants={fadeUp} style={{ maxWidth: 560, margin: "0 auto 3rem", color: muted, fontSize: "1.1rem", lineHeight: 1.65 }}>
              Stop chasing timesheets. FlowSpace automatically tracks attendance, enforces leave policies via an intelligent consequence engine, and secures your payroll data.
            </motion.p>

            <motion.div variants={fadeUp} style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <motion.button onClick={() => router.push("/login")} whileHover={{ scale: 1.05, boxShadow: `0 0 36px ${accent}55` }} whileTap={{ scale: 0.97 }}
                style={{ padding: "0.85rem 2.2rem", borderRadius: 8, border: "none", background: accent, color: light ? "#fff" : "#080B10", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>
                Start Free Trial
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ padding: "0.85rem 2.2rem", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: fg, fontFamily: "'Inter',sans-serif", fontWeight: 400, fontSize: "0.95rem", cursor: "pointer", transition: "border-color 0.3s" }}>
                Watch Demo ↗
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Spacer so asset has room */}
          <div style={{ height: isMobile ? 0 : 80 }} />

          {/* Scroll cue */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
            style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: muted, fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            <span>Scroll</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} style={{ width: 1, height: 32, background: `linear-gradient(to bottom, ${accent}, transparent)` }} />
          </motion.div>
        </section>

        {/* ══ STATS ═════════════════════════════════════════════════════════════ */}
        <section style={{ padding: "0", borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1px", background: border }}
          >
            {STATS.map(s => (
              <motion.div key={s.label} variants={fadeUp}
                style={{ padding: "4rem 2rem", textAlign: "center", background: bg, transition: "background 0.4s" }}>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: accent, letterSpacing: "-0.03em", marginBottom: "0.3rem" }}>{s.value}</p>
                <p style={{ fontSize: "0.78rem", color: muted, letterSpacing: "0.06em" }}>{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ══ FEATURES ══════════════════════════════════════════════════════════ */}
        {/* On desktop: big left padding so asset has room. On mobile: normal. */}
        <section style={{ padding: isMobile ? "6rem 1.5rem" : "10rem 4rem 10rem 52%", minHeight: isMobile ? "auto" : "200vh", position: "relative" }}>
          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ fontSize: "0.68rem", fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.28em", marginBottom: "1rem" }}>
            Core Capabilities
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", color: fg, marginBottom: "5rem" }}>
            Built for serious<br /><span style={{ color: accent }}>operations teams.</span>
          </motion.h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "6rem" }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ maxWidth: 520 }}
              >
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: accent, marginBottom: "0.7rem", fontWeight: 600 }}>0{i + 1}</p>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(1.1rem, 2.5vw, 1.55rem)", fontWeight: 700, color: fg, marginBottom: "0.85rem", lineHeight: 1.25 }}>{f.title}</h3>
                <p style={{ fontSize: "0.93rem", color: muted, lineHeight: 1.75 }}>{f.body}</p>
                <div style={{ marginTop: "1.25rem", height: 1, background: `linear-gradient(to right, ${accent}, transparent)`, width: "60%" }} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══ TESTIMONIALS ══════════════════════════════════════════════════════ */}
        <section style={{ padding: "8rem 0 4rem", overflow: "hidden", background: bg, transition: "background 0.4s" }}>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
            style={{ textAlign: "center", marginBottom: "4rem", padding: "0 2rem" }}>
            <motion.p variants={fadeUp} style={{ fontSize: "0.68rem", fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.28em", marginBottom: "1rem" }}>Trusted Globally</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: fg }}>
              Teams that move with clarity.
            </motion.h2>
          </motion.div>

          {/* Gradient fades */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, zIndex: 2, background: `linear-gradient(to right, ${bg} 0%, transparent 8%, transparent 92%, ${bg} 100%)`, pointerEvents: "none" }} />
            <div style={{ overflow: "hidden", cursor: "default" }} onMouseLeave={() => setHoveredTestimonialIdx(null)}>
              <div className={`marquee-track${hoveredTestimonialIdx !== null ? " paused" : ""}`} style={{ alignItems: "stretch" }}>
                {doubled.map((t, i) => (
                  <TestimonialCard key={i} t={t} light={light} isHovered={hoveredTestimonialIdx === i} onHover={() => setHoveredTestimonialIdx(i)} onLeave={() => setHoveredTestimonialIdx(null)} />
                ))}
              </div>
            </div>
          </div>

          {/* Submit Testimonial CTA */}
          <div style={{ textAlign: "center", marginTop: "3rem", padding: "0 1.5rem" }}>
            <motion.button
              onClick={() => setShowTestimonialModal(true)}
              whileHover={{ scale: 1.04, boxShadow: `0 0 28px ${accent}40` }} whileTap={{ scale: 0.97 }}
              style={{ padding: "0.75rem 2rem", borderRadius: 8, border: `1.5px solid ${accent}`, background: "transparent", color: accent, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", letterSpacing: "0.02em", transition: "box-shadow 0.3s" }}>
              + Share Your Experience
            </motion.button>
          </div>
        </section>

        {/* ══ ENQUIRY ═══════════════════════════════════════════════════════════ */}
        <section id="contact" style={{ padding: "8rem 2rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "10%", right: "5%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "5%", left: "0%", width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${accent}0D 0%, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />

          <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "3rem" : "5rem", alignItems: "center" }}>
            {/* Left copy */}
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
              <motion.p variants={fadeUp} style={{ fontSize: "0.68rem", fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.28em", marginBottom: "1rem" }}>Enterprise Enquiry</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1.5rem", color: fg }}>
                Let's build your<br /><span style={{ color: accent }}>ideal workspace.</span>
              </motion.h2>
              <motion.p variants={fadeUp} style={{ color: muted, fontSize: "0.97rem", lineHeight: 1.75, maxWidth: 380, marginBottom: "2.5rem" }}>
                Tell us about your team and we'll arrange a personalised demo with a solutions engineer within 24 hours.
              </motion.p>
              <motion.div variants={stagger} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {["SOC 2 Type II Certified", "GDPR & DPDP Compliant", "ISO 27001 Audited"].map(b => (
                  <motion.div key={b} variants={fadeUp} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke={`${accent}80`} /><path d="M4 7l2 2 4-4" stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span style={{ fontSize: "0.8rem", color: muted }}>{b}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: form */}
            <EnquiryForm light={light} />
          </div>
        </section>

        {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
        <footer style={{ borderTop: `1px solid ${border}`, padding: "2.5rem 3rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem", background: surfaceBg, transition: "background 0.4s" }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em", color: fg }}>Flow<span style={{ color: accent }}>Space</span></span>
          <p style={{ fontSize: "0.78rem", color: muted }}>&copy; {new Date().getFullYear()} FlowSpace Inc. All rights reserved.</p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {["Privacy", "Terms", "Security", "Status"].map(l => (
              <a key={l} href="#" style={{ fontSize: "0.78rem", color: muted, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </footer>
      </div>

      {/* ── Testimonial Modal ── */}
      <AnimatePresence>
        {showTestimonialModal && (
          <TestimonialModal light={light} onClose={() => setShowTestimonialModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}