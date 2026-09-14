import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Activity, Calendar, Users, Stethoscope, Receipt, FileText, Settings as SettingsIcon,
  Search, Plus, X, ChevronLeft, ChevronRight, LogOut, Bell, Menu, Pencil, Trash2,
  Phone, Mail, MapPin, Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp,
  ArrowRight, Building2, Star, ClipboardList, CalendarDays, CalendarClock,
  ChevronDown, Check, LayoutGrid, List as ListIcon, Droplet, ShieldCheck, Quote
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from "recharts";

/* ============================================================================
   CHARTWELL — Clinic Management System
   Design tokens: deep forest ink, warm paper, amber + coral accents.
   Serif display (Fraunces) for editorial voice, Inter for UI, JetBrains Mono
   for anything tabular (times, IDs, amounts) since that's functional here.
============================================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

.cw {
  --ink: #16241F;
  --ink-soft: #3C4A45;
  --paper: #F1F0EA;
  --paper-raised: #FBFAF6;
  --forest: #1E4638;
  --forest-dark: #123025;
  --moss: #5C7A67;
  --line: #DAD6C9;
  --amber: #C8862B;
  --amber-soft: #F3E3C6;
  --coral: #B5432F;
  --coral-soft: #F3DBD3;
  --blue: #386A8A;
  --blue-soft: #DCE7EC;
  --white: #FFFFFF;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
}
.cw * { box-sizing: border-box; }
.cw .serif { font-family: 'Fraunces', serif; }
.cw .mono { font-family: 'JetBrains Mono', monospace; }
.cw button { font-family: inherit; cursor: pointer; }
.cw input, .cw select, .cw textarea { font-family: inherit; }
.cw a { color: inherit; text-decoration: none; }
.cw ::selection { background: var(--amber-soft); }

/* ---------- Buttons ---------- */
.cw-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 20px; border-radius: 7px; font-weight: 600; font-size: 14.5px;
  border: 1px solid transparent; transition: transform .12s ease, background .15s ease, border-color .15s ease;
  white-space: nowrap;
}
.cw-btn:active { transform: scale(0.97); }
.cw-btn-primary { background: var(--forest); color: var(--white); }
.cw-btn-primary:hover { background: var(--forest-dark); }
.cw-btn-ghost { background: transparent; color: var(--ink); border-color: var(--line); }
.cw-btn-ghost:hover { border-color: var(--ink-soft); }
.cw-btn-amber { background: var(--amber); color: var(--forest-dark); }
.cw-btn-amber:hover { filter: brightness(1.06); }
.cw-btn-danger { background: transparent; color: var(--coral); border-color: var(--coral-soft); }
.cw-btn-danger:hover { background: var(--coral-soft); }
.cw-btn-sm { padding: 7px 13px; font-size: 13px; border-radius: 6px; }
.cw-btn-icon { padding: 8px; border-radius: 6px; }
.cw-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ---------- Landing ---------- */
.cw-landing { background: var(--paper); min-height: 100vh; }
.cw-nav {
  position: sticky; top: 0; z-index: 40; background: rgba(241,240,234,0.88);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--line);
}
.cw-nav-inner {
  max-width: 1180px; margin: 0 auto; padding: 18px 28px; display: flex;
  align-items: center; justify-content: space-between;
}
.cw-logo { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 19px; }
.cw-logo-mark {
  width: 30px; height: 30px; border-radius: 7px; background: var(--forest);
  display: flex; align-items: center; justify-content: center; color: var(--amber-soft); flex-shrink: 0;
}
.cw-nav-links { display: flex; align-items: center; gap: 30px; }
.cw-nav-links a { font-size: 14.5px; font-weight: 500; color: var(--ink-soft); }
.cw-nav-links a:hover { color: var(--ink); }
.cw-nav-actions { display: flex; align-items: center; gap: 10px; }

.cw-hero {
  max-width: 1180px; margin: 0 auto; padding: 74px 28px 60px; display: grid;
  grid-template-columns: 1.05fr 0.95fr; gap: 56px; align-items: center;
}
.cw-eyebrow-line { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
.cw-eyebrow-line .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--amber); }
.cw-eyebrow-line span { font-size: 13.5px; color: var(--moss); font-weight: 600; }
.cw-hero h1 {
  font-size: 52px; line-height: 1.06; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 22px;
}
.cw-hero p.lede { font-size: 18px; line-height: 1.55; color: var(--ink-soft); max-width: 46ch; margin: 0 0 32px; }
.cw-hero-actions { display: flex; align-items: center; gap: 18px; }
.cw-hero-note { font-size: 13.5px; color: var(--moss); }

.cw-ledger-card {
  background: var(--paper-raised); border: 1px solid var(--line); border-radius: 14px;
  box-shadow: 0 1px 0 rgba(22,36,31,0.03); overflow: hidden;
}
.cw-ledger-head {
  display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
  border-bottom: 1px solid var(--line); background: var(--forest); color: var(--white);
}
.cw-ledger-head .t { font-size: 13.5px; font-weight: 600; }
.cw-ledger-head .d { font-size: 12px; color: #CFE0D6; }
.cw-ledger-row {
  display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 12px;
  padding: 13px 20px; border-bottom: 1px solid var(--line);
}
.cw-ledger-row:last-child { border-bottom: none; }
.cw-ledger-time { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: var(--moss); }
.cw-ledger-name { font-size: 14px; font-weight: 600; }
.cw-ledger-meta { font-size: 12.5px; color: var(--ink-soft); }

.cw-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px; font-size: 11.5px; font-weight: 600; }
.cw-badge-scheduled { background: var(--blue-soft); color: var(--blue); }
.cw-badge-completed { background: #DCEADD; color: #2E6B3E; }
.cw-badge-cancelled { background: var(--coral-soft); color: var(--coral); }
.cw-badge-noshow { background: #EFE3CF; color: var(--amber); }
.cw-badge-unpaid { background: var(--coral-soft); color: var(--coral); }
.cw-badge-paid { background: #DCEADD; color: #2E6B3E; }

.cw-section { max-width: 1180px; margin: 0 auto; padding: 84px 28px; }
.cw-section-head { max-width: 640px; margin-bottom: 46px; }
.cw-section-head h2 { font-size: 34px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 14px; }
.cw-section-head p { font-size: 16.5px; color: var(--ink-soft); line-height: 1.55; }

.cw-rule { border: none; border-top: 1px solid var(--line); }

.cw-feature-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.cw-feature { background: var(--paper-raised); padding: 30px 26px; }
.cw-feature .icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; background: var(--forest); color: var(--amber-soft); }
.cw-feature h3 { font-size: 16.5px; font-weight: 700; margin: 0 0 8px; }
.cw-feature p { font-size: 14px; color: var(--ink-soft); line-height: 1.5; margin: 0; }

.cw-practice-row { display: flex; flex-wrap: wrap; gap: 10px; }
.cw-practice-pill { border: 1px solid var(--line); background: var(--paper-raised); padding: 9px 16px; border-radius: 20px; font-size: 13.5px; font-weight: 600; color: var(--ink-soft); }

.cw-flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.cw-flow-step .num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--amber); font-weight: 600; margin-bottom: 10px; }
.cw-flow-step h4 { font-size: 15.5px; font-weight: 700; margin: 0 0 8px; }
.cw-flow-step p { font-size: 13.5px; color: var(--ink-soft); line-height: 1.5; margin: 0; }
.cw-flow-step { border-top: 2px solid var(--forest); padding-top: 16px; }

.cw-quote-card { background: var(--forest); color: var(--white); border-radius: 14px; padding: 40px; display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: start; }
.cw-quote-card p.q { font-size: 20px; line-height: 1.5; font-family: 'Fraunces', serif; font-weight: 500; margin: 0 0 18px; }
.cw-quote-card .who { font-size: 13.5px; color: #CFE0D6; }
.cw-quote-card .who b { color: var(--white); }

.cw-pricing { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.cw-price-card { border: 1px solid var(--line); border-radius: 12px; padding: 28px; background: var(--paper-raised); display: flex; flex-direction: column; }
.cw-price-card.featured { border-color: var(--forest); box-shadow: 0 0 0 1px var(--forest); }
.cw-price-card .tier { font-size: 13.5px; font-weight: 700; color: var(--moss); margin-bottom: 6px; }
.cw-price-card .amount { font-size: 36px; font-weight: 600; font-family: 'Fraunces', serif; margin-bottom: 4px; }
.cw-price-card .per { font-size: 13px; color: var(--ink-soft); margin-bottom: 22px; }
.cw-price-card ul { list-style: none; padding: 0; margin: 0 0 26px; display: flex; flex-direction: column; gap: 11px; flex: 1; }
.cw-price-card li { display: flex; gap: 9px; font-size: 13.5px; color: var(--ink-soft); align-items: flex-start; }
.cw-price-card li svg { flex-shrink: 0; margin-top: 2px; color: var(--forest); }

.cw-faq-item { border-bottom: 1px solid var(--line); padding: 20px 0; }
.cw-faq-q { display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 15.5px; }
.cw-faq-a { font-size: 14.5px; color: var(--ink-soft); line-height: 1.6; margin-top: 12px; max-width: 68ch; }

.cw-footer { border-top: 1px solid var(--line); }
.cw-footer-inner { max-width: 1180px; margin: 0 auto; padding: 44px 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.cw-footer-inner .cols { display: flex; gap: 40px; }
.cw-footer-inner .cols a { font-size: 13.5px; color: var(--ink-soft); display: block; margin-bottom: 8px; }

/* ---------- Auth ---------- */
.cw-auth-wrap { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
.cw-auth-side { background: var(--forest); color: var(--white); padding: 48px; display: flex; flex-direction: column; justify-content: space-between; }
.cw-auth-side .headline { font-family: 'Fraunces', serif; font-size: 30px; line-height: 1.25; font-weight: 500; max-width: 24ch; }
.cw-auth-form-wrap { display: flex; align-items: center; justify-content: center; padding: 40px; }
.cw-auth-form { width: 100%; max-width: 380px; }
.cw-auth-form h2 { font-size: 26px; font-weight: 600; margin: 0 0 8px; }
.cw-auth-form > p { font-size: 14.5px; color: var(--ink-soft); margin: 0 0 32px; }
.cw-field { margin-bottom: 16px; }
.cw-field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--ink-soft); }
.cw-input, .cw-select, .cw-textarea {
  width: 100%; padding: 11px 13px; border: 1px solid var(--line); border-radius: 7px;
  font-size: 14.5px; background: var(--paper-raised); color: var(--ink); outline: none;
  transition: border-color .12s ease;
}
.cw-input:focus, .cw-select:focus, .cw-textarea:focus { border-color: var(--forest); }
.cw-input::placeholder { color: #97968A; }
.cw-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cw-check-row { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink-soft); }
.cw-demo-box { margin-top: 22px; padding: 12px 14px; background: var(--amber-soft); border-radius: 8px; font-size: 12.5px; color: #6B4C15; line-height: 1.5; }

/* ---------- App shell ---------- */
.cw-app { display: grid; grid-template-columns: 232px 1fr; min-height: 100vh; background: var(--paper); }
.cw-sidebar { background: var(--forest-dark); color: #D9E4DE; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
.cw-sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 22px 20px; font-weight: 700; font-size: 16.5px; color: var(--white); }
.cw-sidebar-nav { flex: 1; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.cw-nav-item {
  display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 7px;
  font-size: 14px; font-weight: 500; color: #B9C8C0; transition: background .12s ease, color .12s ease; border: none; background: transparent; text-align: left; width: 100%;
}
.cw-nav-item:hover { background: rgba(255,255,255,0.06); color: var(--white); }
.cw-nav-item.active { background: var(--forest); color: var(--white); }
.cw-sidebar-foot { padding: 14px 12px; border-top: 1px solid rgba(255,255,255,0.08); }
.cw-sidebar-clinic { padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); }
.cw-sidebar-clinic .name { font-size: 13.5px; font-weight: 600; color: var(--white); }
.cw-sidebar-clinic .plan { font-size: 11.5px; color: #93A69C; margin-top: 2px; }

.cw-topbar { position: sticky; top: 0; z-index: 20; background: var(--paper); border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; padding: 16px 28px; }
.cw-topbar h1 { font-size: 21px; font-weight: 700; margin: 0; }
.cw-topbar-search { display: flex; align-items: center; gap: 8px; background: var(--paper-raised); border: 1px solid var(--line); border-radius: 7px; padding: 8px 12px; width: 260px; }
.cw-topbar-search input { border: none; background: transparent; outline: none; font-size: 13.5px; width: 100%; }
.cw-topbar-actions { display: flex; align-items: center; gap: 14px; }
.cw-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--forest); color: var(--white); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.cw-icon-btn { position: relative; width: 36px; height: 36px; border-radius: 7px; border: 1px solid var(--line); background: var(--paper-raised); display: flex; align-items: center; justify-content: center; color: var(--ink-soft); }
.cw-icon-btn:hover { color: var(--ink); }
.cw-dot-badge { position: absolute; top: 6px; right: 7px; width: 7px; height: 7px; border-radius: 50%; background: var(--coral); }

.cw-main { padding: 28px; max-width: 1280px; }

/* ---------- Cards / stats ---------- */
.cw-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 22px; }
.cw-stat-card { background: var(--paper-raised); border: 1px solid var(--line); border-radius: 11px; padding: 18px 20px; }
.cw-stat-card .top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.cw-stat-card .icon { width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center; }
.cw-stat-card .val { font-size: 25px; font-weight: 700; font-family: 'Fraunces', serif; }
.cw-stat-card .lbl { font-size: 13px; color: var(--ink-soft); margin-top: 2px; }
.cw-stat-card .delta { font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 3px; }

.cw-panel { background: var(--paper-raised); border: 1px solid var(--line); border-radius: 11px; }
.cw-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); }
.cw-panel-head h3 { font-size: 15.5px; font-weight: 700; margin: 0; }
.cw-panel-body { padding: 18px 20px; }

.cw-grid-2 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }

.cw-list-row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line); }
.cw-list-row:last-child { border-bottom: none; }

/* ---------- Table ---------- */
.cw-table-wrap { overflow-x: auto; }
.cw-table { width: 100%; border-collapse: collapse; font-size: 13.8px; }
.cw-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--moss); font-weight: 700; padding: 0 16px 10px; border-bottom: 1px solid var(--line); }
.cw-table td { padding: 13px 16px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.cw-table tr:last-child td { border-bottom: none; }
.cw-table tr.clickable:hover { background: var(--paper); cursor: pointer; }
.cw-table .num { font-family: 'JetBrains Mono', monospace; font-size: 13px; }

.cw-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
.cw-toolbar-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.cw-search-box { display: flex; align-items: center; gap: 8px; background: var(--paper-raised); border: 1px solid var(--line); border-radius: 7px; padding: 9px 12px; max-width: 280px; flex: 1; }
.cw-search-box input { border: none; background: transparent; outline: none; font-size: 13.5px; width: 100%; }
.cw-chip-filter { display: flex; gap: 6px; }
.cw-chip { padding: 7px 13px; border-radius: 20px; font-size: 13px; font-weight: 600; border: 1px solid var(--line); background: var(--paper-raised); color: var(--ink-soft); }
.cw-chip.active { background: var(--forest); border-color: var(--forest); color: var(--white); }

.cw-empty { text-align: center; padding: 60px 20px; color: var(--ink-soft); }
.cw-empty .icon { width: 46px; height: 46px; border-radius: 10px; background: var(--paper); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--moss); }
.cw-empty h4 { font-size: 15.5px; font-weight: 700; color: var(--ink); margin: 0 0 6px; }
.cw-empty p { font-size: 13.5px; margin: 0 0 18px; }

/* ---------- Modal / Drawer ---------- */
.cw-overlay { position: fixed; inset: 0; background: rgba(18,29,25,0.42); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; }
.cw-modal { background: var(--paper-raised); border-radius: 13px; width: 100%; max-width: 560px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.cw-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--line); }
.cw-modal-head h3 { font-size: 17px; font-weight: 700; margin: 0; }
.cw-modal-body { padding: 22px 24px; max-height: 65vh; overflow-y: auto; }
.cw-modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--line); }

.cw-drawer-overlay { position: fixed; inset: 0; background: rgba(18,29,25,0.42); z-index: 100; display: flex; justify-content: flex-end; }
.cw-drawer { background: var(--paper-raised); width: 480px; max-width: 92vw; height: 100vh; overflow-y: auto; box-shadow: -12px 0 40px rgba(0,0,0,0.15); }
.cw-drawer-head { padding: 24px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: flex-start; }
.cw-drawer-body { padding: 24px; }

/* ---------- Calendar ---------- */
.cw-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cw-cal-dow { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--moss); text-align: center; padding-bottom: 6px; }
.cw-cal-cell { min-height: 78px; border: 1px solid var(--line); border-radius: 8px; padding: 7px; background: var(--paper-raised); cursor: pointer; transition: border-color .12s ease; }
.cw-cal-cell:hover { border-color: var(--moss); }
.cw-cal-cell.muted { opacity: 0.38; }
.cw-cal-cell.today { border-color: var(--forest); border-width: 2px; }
.cw-cal-cell.selected { background: var(--amber-soft); border-color: var(--amber); }
.cw-cal-daynum { font-size: 12.5px; font-weight: 700; margin-bottom: 5px; }
.cw-cal-pip { font-size: 10.5px; background: var(--forest); color: var(--white); border-radius: 5px; padding: 1px 5px; display: inline-block; margin-bottom: 2px; }

/* ---------- Toast ---------- */
.cw-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--forest-dark); color: var(--white); padding: 12px 20px; border-radius: 8px; font-size: 13.5px; font-weight: 500; z-index: 200; display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }

.cw-doctor-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.cw-doctor-card { background: var(--paper-raised); border: 1px solid var(--line); border-radius: 11px; padding: 20px; }
.cw-doctor-card .head { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.cw-doctor-card .name { font-weight: 700; font-size: 15px; }
.cw-doctor-card .spec { font-size: 12.5px; color: var(--moss); font-weight: 600; }
.cw-doctor-card .row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-soft); margin-bottom: 7px; }
.cw-doctor-card .days { display: flex; gap: 5px; margin-top: 12px; flex-wrap: wrap; }
.cw-daychip { font-size: 10.5px; font-weight: 700; padding: 3px 7px; border-radius: 5px; background: var(--paper); color: var(--ink-soft); }
.cw-daychip.on { background: var(--forest); color: var(--white); }

.cw-tabs { display: flex; gap: 4px; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 3px; width: fit-content; }
.cw-tab { padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; color: var(--ink-soft); background: transparent; border: none; display: flex; align-items: center; gap: 6px; }
.cw-tab.active { background: var(--paper-raised); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,0.06); }

.cw-record-card { border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; background: var(--paper-raised); }
.cw-record-card .rhead { display: flex; justify-content: space-between; margin-bottom: 8px; }
.cw-record-card .rdate { font-size: 12px; color: var(--moss); font-family: 'JetBrains Mono', monospace; }

@media (max-width: 980px) {
  .cw-hero { grid-template-columns: 1fr; padding-top: 40px; }
  .cw-hero h1 { font-size: 38px; }
  .cw-feature-list, .cw-flow, .cw-pricing, .cw-doctor-grid { grid-template-columns: repeat(2,1fr); }
  .cw-stat-grid { grid-template-columns: repeat(2,1fr); }
  .cw-grid-2 { grid-template-columns: 1fr; }
  .cw-nav-links { display: none; }
  .cw-auth-wrap { grid-template-columns: 1fr; }
  .cw-auth-side { display: none; }
  .cw-app { grid-template-columns: 1fr; }
  .cw-sidebar { position: fixed; z-index: 60; left: -240px; transition: left .18s ease; }
  .cw-sidebar.open { left: 0; }
}
@media (max-width: 640px) {
  .cw-feature-list, .cw-flow, .cw-pricing, .cw-doctor-grid, .cw-stat-grid { grid-template-columns: 1fr; }
  .cw-topbar-search { display: none; }
  .cw-row2 { grid-template-columns: 1fr; }
  .cw-cal-grid { gap: 3px; }
  .cw-cal-cell { min-height: 52px; padding: 4px; }
}
`;

/* ============================================================================
   SEED DATA
============================================================================ */

const seedPatients = [
  { id: "P-1042", name: "Meera Chandran", age: 34, gender: "Female", phone: "+91 98765 43210", email: "meera.c@mail.com", address: "14 Lotus Lane, Panipat", bloodGroup: "O+", allergies: "Penicillin", condition: "Hypertension follow-up", lastVisit: "2026-08-28", color: "#1E4638" },
  { id: "P-1043", name: "Arjun Patel", age: 8, gender: "Male", phone: "+91 91234 56780", email: "arjun.parent@mail.com", address: "22 Birch Court, Panipat", bloodGroup: "A+", allergies: "None known", condition: "Routine vaccination", lastVisit: "2026-08-30", color: "#386A8A" },
  { id: "P-1044", name: "Priya Nair", age: 29, gender: "Female", phone: "+91 99887 66554", email: "priya.nair@mail.com", address: "9 Cedar Street, Panipat", bloodGroup: "B+", allergies: "Latex", condition: "Root canal — molar #3", lastVisit: "2026-09-01", color: "#C8862B" },
  { id: "P-1045", name: "Rohit Sharma", age: 46, gender: "Male", phone: "+91 90011 22334", email: "rohit.sh@mail.com", address: "5 Maple Ave, Panipat", bloodGroup: "AB+", allergies: "None known", condition: "Type 2 diabetes checkup", lastVisit: "2026-08-15", color: "#B5432F" },
  { id: "P-1046", name: "Sana Iqbal", age: 61, gender: "Female", phone: "+91 98123 45670", email: "sana.iqbal@mail.com", address: "3 Willow Rd, Panipat", bloodGroup: "O-", allergies: "Sulfa drugs", condition: "Post-op knee follow-up", lastVisit: "2026-08-22", color: "#5C7A67" },
  { id: "P-1047", name: "Karan Mehta", age: 17, gender: "Male", phone: "+91 97654 32109", email: "karan.m@mail.com", address: "18 Elm Street, Panipat", bloodGroup: "A-", allergies: "None known", condition: "Sports physical", lastVisit: "2026-07-30", color: "#1E4638" },
];

const seedDoctors = [
  { id: "D-01", name: "Dr. Ananya Rao", specialty: "General Physician", phone: "+91 98111 22233", email: "a.rao@chartwell-demo.com", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "D-02", name: "Dr. Vikram Sen", specialty: "Dental Surgeon", phone: "+91 98222 33344", email: "v.sen@chartwell-demo.com", days: ["Mon", "Wed", "Fri", "Sat"] },
  { id: "D-03", name: "Dr. Lisa Fernandes", specialty: "Pediatrician", phone: "+91 98333 44455", email: "l.fernandes@chartwell-demo.com", days: ["Tue", "Thu", "Sat"] },
  { id: "D-04", name: "Dr. Imran Qureshi", specialty: "Orthopedic", phone: "+91 98444 55566", email: "i.qureshi@chartwell-demo.com", days: ["Mon", "Tue", "Thu", "Fri"] },
];

function pad(n) { return String(n).padStart(2, "0"); }
function toISO(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
const today = new Date();
const isoToday = toISO(today.getFullYear(), today.getMonth(), today.getDate());
function shiftDate(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

const seedAppointments = [
  { id: "A-3001", patientId: "P-1042", doctorId: "D-01", date: isoToday, time: "09:00", duration: 30, reason: "Hypertension follow-up", status: "scheduled" },
  { id: "A-3002", patientId: "P-1043", doctorId: "D-03", date: isoToday, time: "09:45", duration: 20, reason: "Vaccination — MMR booster", status: "scheduled" },
  { id: "A-3003", patientId: "P-1044", doctorId: "D-02", date: isoToday, time: "10:30", duration: 60, reason: "Root canal — molar #3, session 2", status: "scheduled" },
  { id: "A-3004", patientId: "P-1045", doctorId: "D-01", date: isoToday, time: "11:30", duration: 30, reason: "Diabetes checkup — HbA1c review", status: "scheduled" },
  { id: "A-3005", patientId: "P-1046", doctorId: "D-04", date: shiftDate(isoToday, -1), time: "14:00", duration: 30, reason: "Post-op knee follow-up", status: "completed" },
  { id: "A-3006", patientId: "P-1047", doctorId: "D-01", date: shiftDate(isoToday, -1), time: "16:00", duration: 20, reason: "Sports physical clearance", status: "completed" },
  { id: "A-3007", patientId: "P-1042", doctorId: "D-01", date: shiftDate(isoToday, -3), time: "10:00", duration: 30, reason: "Initial consult — blood pressure", status: "completed" },
  { id: "A-3008", patientId: "P-1044", doctorId: "D-02", date: shiftDate(isoToday, -3), time: "13:00", duration: 60, reason: "Root canal — molar #3, session 1", status: "completed" },
  { id: "A-3009", patientId: "P-1046", doctorId: "D-04", date: shiftDate(isoToday, 2), time: "15:00", duration: 30, reason: "Knee physiotherapy check-in", status: "scheduled" },
  { id: "A-3010", patientId: "P-1043", doctorId: "D-03", date: shiftDate(isoToday, 5), time: "09:30", duration: 20, reason: "Growth chart review", status: "scheduled" },
  { id: "A-3011", patientId: "P-1045", doctorId: "D-01", date: shiftDate(isoToday, -6), time: "11:00", duration: 30, reason: "Diabetes checkup", status: "noshow" },
  { id: "A-3012", patientId: "P-1047", doctorId: "D-04", date: shiftDate(isoToday, -8), time: "10:00", duration: 30, reason: "Ankle sprain review", status: "cancelled" },
];

const seedInvoices = [
  { id: "INV-2201", patientId: "P-1044", date: shiftDate(isoToday, -3), items: [{ desc: "Root canal — session 1", amount: 6500 }, { desc: "X-ray", amount: 800 }], status: "paid" },
  { id: "INV-2202", patientId: "P-1046", doctorId: "D-04", date: shiftDate(isoToday, -1), items: [{ desc: "Consultation", amount: 900 }, { desc: "Physiotherapy session", amount: 1200 }], status: "unpaid" },
  { id: "INV-2203", patientId: "P-1042", date: shiftDate(isoToday, -6), items: [{ desc: "Consultation", amount: 700 }, { desc: "Lab panel — lipid profile", amount: 1500 }], status: "paid" },
  { id: "INV-2204", patientId: "P-1047", date: shiftDate(isoToday, -8), items: [{ desc: "Sports physical", amount: 950 }], status: "unpaid" },
  { id: "INV-2205", patientId: "P-1045", date: shiftDate(isoToday, -14), items: [{ desc: "Consultation", amount: 700 }, { desc: "HbA1c test", amount: 950 }], status: "paid" },
];

const seedRecords = [
  { id: "R-901", patientId: "P-1042", doctorId: "D-01", date: shiftDate(isoToday, -3), diagnosis: "Stage 1 hypertension", prescription: "Amlodipine 5mg — once daily", notes: "BP 148/92 at visit. Recommended low-sodium diet and 30 min daily walk. Recheck in 4 weeks." },
  { id: "R-902", patientId: "P-1044", doctorId: "D-02", date: shiftDate(isoToday, -3), diagnosis: "Irreversible pulpitis, molar #3", prescription: "Amoxicillin 500mg — 3x daily, 5 days", notes: "Completed session 1 of root canal. Canal cleaned and shaped. Temporary filling placed. Session 2 scheduled." },
  { id: "R-903", patientId: "P-1046", doctorId: "D-04", date: shiftDate(isoToday, -1), diagnosis: "Post-op recovery — right knee ACL reconstruction", prescription: "Naproxen 250mg as needed", notes: "Range of motion improving, 110° flexion achieved. Continue physiotherapy twice weekly." },
  { id: "R-904", patientId: "P-1045", doctorId: "D-01", date: shiftDate(isoToday, -14), diagnosis: "Type 2 diabetes mellitus, moderately controlled", prescription: "Metformin 500mg — twice daily", notes: "HbA1c 7.2%, down from 7.8%. Continue current regimen, reinforce dietary counseling." },
];

/* ============================================================================
   SMALL HELPERS
============================================================================ */

function initials(name) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateShort(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtTime12(t) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)} ${suffix}`;
}
function currency(n) {
  return "₹" + n.toLocaleString("en-IN");
}
function StatusBadge({ status }) {
  const map = {
    scheduled: { cls: "cw-badge-scheduled", icon: Clock, label: "Scheduled" },
    completed: { cls: "cw-badge-completed", icon: CheckCircle2, label: "Completed" },
    cancelled: { cls: "cw-badge-cancelled", icon: XCircle, label: "Cancelled" },
    noshow: { cls: "cw-badge-noshow", icon: AlertCircle, label: "No-show" },
    paid: { cls: "cw-badge-paid", icon: CheckCircle2, label: "Paid" },
    unpaid: { cls: "cw-badge-unpaid", icon: AlertCircle, label: "Unpaid" },
  };
  const m = map[status] || map.scheduled;
  const Icon = m.icon;
  return <span className={`cw-badge ${m.cls}`}><Icon size={11.5} />{m.label}</span>;
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="cw-toast"><Check size={15} />{message}</div>;
}

/* ============================================================================
   LANDING PAGE
============================================================================ */

function LandingPage({ goto }) {
  const [openFaq, setOpenFaq] = useState(0);
  const faqs = [
    { q: "Does Chartwell work for a dental practice as well as a general clinic?", a: "Yes. Chartwell isn't built around one specialty. Patient records, appointments, billing and staff scheduling are generic by design, so a solo dentist, a family practice, a physiotherapy studio or a multi-doctor general clinic can all run on the same system without workarounds." },
    { q: "Can more than one doctor use it at the same clinic?", a: "You can add as many doctors and staff members as your clinic needs, each with their own schedule, specialty and appointment list. The front desk sees everyone's calendar in one place." },
    { q: "What happens to patient data if we stop using Chartwell?", a: "You can export your full patient list, appointment history and billing records at any time from Settings. Nothing is locked in." },
    { q: "Is there a limit on patients or appointments?", a: "The Practice and Clinic plans have no cap on patients, appointments or records. The Starter plan is capped at 200 active patients, which suits a single-doctor office just getting started." },
  ];

  return (
    <div className="cw-landing">
      <style>{CSS}</style>
      <div className="cw">
        <nav className="cw-nav">
          <div className="cw-nav-inner">
            <div className="cw-logo">
              <span className="cw-logo-mark"><ClipboardList size={16} /></span>
              Chartwell
            </div>
            <div className="cw-nav-links">
              <a href="#features">Features</a>
              <a href="#workflow">How it works</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="cw-nav-actions">
              <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => goto("login")}>Log in</button>
              <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => goto("register")}>Start free</button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <header className="cw-hero">
          <div>
            <div className="cw-eyebrow-line"><span className="dot" /><span>Built for clinics, not hospitals or hotels</span></div>
            <h1 className="serif">Every patient, every visit, every clinic — kept in one record.</h1>
            <p className="lede">Chartwell is the day-to-day system for running a clinic: booking appointments, keeping patient charts current, and sending invoices that get paid. Works the same whether you're a solo dentist or a five-doctor family practice.</p>
            <div className="cw-hero-actions">
              <button className="cw-btn cw-btn-primary" onClick={() => goto("register")}>Start free <ArrowRight size={16} /></button>
              <button className="cw-btn cw-btn-ghost" onClick={() => goto("login")}>View live demo</button>
            </div>
            <p className="cw-hero-note" style={{ marginTop: 18 }}>No card required. Set up your clinic in under five minutes.</p>
          </div>

          <div className="cw-ledger-card">
            <div className="cw-ledger-head">
              <div>
                <div className="t">Today's schedule</div>
                <div className="d">{fmtDate(isoToday)} · Riverside Family Clinic</div>
              </div>
              <CalendarDays size={18} color="#CFE0D6" />
            </div>
            {seedAppointments.filter(a => a.date === isoToday).slice(0, 4).map(a => {
              const p = seedPatients.find(pp => pp.id === a.patientId);
              return (
                <div className="cw-ledger-row" key={a.id}>
                  <div className="cw-ledger-time">{fmtTime12(a.time)}</div>
                  <div>
                    <div className="cw-ledger-name">{p.name}</div>
                    <div className="cw-ledger-meta">{a.reason}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              );
            })}
          </div>
        </header>

        {/* PRACTICE TYPES */}
        <div className="cw-section" style={{ paddingTop: 0, paddingBottom: 40 }}>
          <div className="cw-practice-row">
            {["General practice", "Dental", "Pediatrics", "Physiotherapy", "Orthopedics", "Dermatology", "ENT", "Multi-specialty"].map(t => (
              <span className="cw-practice-pill" key={t}>{t}</span>
            ))}
          </div>
        </div>

        <hr className="cw-rule" />

        {/* FEATURES */}
        <section className="cw-section" id="features">
          <div className="cw-section-head">
            <h2 className="serif">The eight things a clinic actually needs</h2>
            <p>Not a bloated hospital ERP, and not a bare-bones calendar. Chartwell covers the daily operations of a clinic front-to-back.</p>
          </div>
          <div className="cw-feature-list">
            {[
              { icon: Users, title: "Patient records", desc: "One chart per patient: contact details, history, allergies, and every visit, in order." },
              { icon: Calendar, title: "Appointment scheduling", desc: "Calendar and list views, per-doctor availability, and status tracking from booked to completed." },
              { icon: Stethoscope, title: "Doctor & staff directory", desc: "Manage every provider's specialty, contact details, and working days in one directory." },
              { icon: Receipt, title: "Billing & invoices", desc: "Itemized invoices tied to visits, paid/unpaid tracking, and a running revenue picture." },
              { icon: FileText, title: "Medical records", desc: "Diagnosis, prescriptions and clinical notes attached to the right patient and visit." },
              { icon: Activity, title: "Clinic overview", desc: "Today's schedule, revenue trends and patient volume, visible the moment you log in." },
              { icon: ShieldCheck, title: "Role-based access", desc: "Front desk, doctors and admins see exactly what their role needs — nothing more." },
              { icon: Building2, title: "Works for any clinic", desc: "No specialty baked in. Dental, general, physio or multi-specialty — same system." },
              { icon: SettingsIcon, title: "Clinic settings", desc: "Working hours, clinic profile and notification preferences, all in one settings page." },
            ].map((f, i) => (
              <div className="cw-feature" key={i}>
                <div className="icon"><f.icon size={17} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="cw-section" id="workflow" style={{ paddingTop: 0 }}>
          <div className="cw-section-head">
            <h2 className="serif">From walk-in to paid invoice</h2>
            <p>The same four steps repeat all day at the front desk — Chartwell is built around that loop.</p>
          </div>
          <div className="cw-flow">
            {[
              { n: "01", t: "Register the patient", d: "New patient in under a minute: name, contact, and any known conditions or allergies." },
              { n: "02", t: "Book the visit", d: "Pick a doctor, date and time. Conflicts and doctor availability are visible on the calendar." },
              { n: "03", t: "Record the visit", d: "Doctor logs diagnosis, prescription and notes directly against the patient's chart." },
              { n: "04", t: "Send the invoice", d: "Itemize the visit and mark it paid or unpaid — it rolls straight into your revenue view." },
            ].map(s => (
              <div className="cw-flow-step" key={s.n}>
                <div className="num">{s.n}</div>
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* QUOTE */}
        <section className="cw-section" style={{ paddingTop: 0 }}>
          <div className="cw-quote-card">
            <Quote size={30} color="#C8862B" />
            <div>
              <p className="q">"We run a two-doctor general practice and a weekend dental clinic out of the same building. Every other system made us choose one specialty. Chartwell just let us add both doctors and go."</p>
              <div className="who"><b>Dr. Ananya Rao</b> — Riverside Family Clinic</div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="cw-section" id="pricing" style={{ paddingTop: 0 }}>
          <div className="cw-section-head">
            <h2 className="serif">Priced by clinic, not by feature</h2>
            <p>Every plan includes patients, appointments, billing and records. The difference is scale and support.</p>
          </div>
          <div className="cw-pricing">
            {[
              { tier: "Starter", amount: "₹0", per: "up to 200 patients, forever free", featured: false, items: ["1 doctor login", "Appointment calendar", "Basic billing", "Community support"] },
              { tier: "Practice", amount: "₹1,499", per: "per month, per clinic", featured: true, items: ["Up to 6 doctor logins", "Unlimited patients", "Invoicing & revenue reports", "Priority email support", "Data export"] },
              { tier: "Clinic Group", amount: "₹3,999", per: "per month, per location", featured: false, items: ["Unlimited doctor logins", "Multi-location overview", "Custom roles & permissions", "Dedicated onboarding"] },
            ].map(p => (
              <div className={`cw-price-card ${p.featured ? "featured" : ""}`} key={p.tier}>
                <div className="tier">{p.tier}</div>
                <div className="amount serif">{p.amount}</div>
                <div className="per">{p.per}</div>
                <ul>
                  {p.items.map(it => <li key={it}><Check size={15} />{it}</li>)}
                </ul>
                <button className={`cw-btn ${p.featured ? "cw-btn-primary" : "cw-btn-ghost"}`} onClick={() => goto("register")} style={{ width: "100%" }}>Start free</button>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="cw-section" id="faq" style={{ paddingTop: 0, maxWidth: 800 }}>
          <div className="cw-section-head">
            <h2 className="serif">Questions clinics usually ask</h2>
          </div>
          {faqs.map((f, i) => (
            <div className="cw-faq-item" key={i}>
              <div className="cw-faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={{ cursor: "pointer" }}>
                {f.q}
                <ChevronDown size={18} style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0 }} />
              </div>
              {openFaq === i && <div className="cw-faq-a">{f.a}</div>}
            </div>
          ))}
        </section>

        {/* FINAL CTA */}
        <section className="cw-section" style={{ paddingTop: 0 }}>
          <div className="cw-quote-card" style={{ gridTemplateColumns: "1fr auto", alignItems: "center", background: "var(--forest-dark)" }}>
            <div>
              <p className="q" style={{ marginBottom: 6, fontSize: 24 }}>Set your clinic up this afternoon.</p>
              <div className="who">Free for up to 200 patients. No card, no contract.</div>
            </div>
            <button className="cw-btn cw-btn-amber" onClick={() => goto("register")}>Start free <ArrowRight size={16} /></button>
          </div>
        </section>

        <footer className="cw-footer">
          <div className="cw-footer-inner">
            <div className="cw-logo"><span className="cw-logo-mark"><ClipboardList size={16} /></span>Chartwell</div>
            <div className="cols">
              <div><a href="#features">Features</a><a href="#pricing">Pricing</a></div>
              <div><a href="#faq">FAQ</a><a onClick={() => goto("login")}>Log in</a></div>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>© 2026 Chartwell. A demo clinic management system.</div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ============================================================================
   AUTH PAGES
============================================================================ */

function AuthShell({ children, headline, sub }) {
  return (
    <div className="cw cw-auth-wrap">
      <style>{CSS}</style>
      <div className="cw-auth-side">
        <div className="cw-logo" style={{ color: "var(--white)" }}>
          <span className="cw-logo-mark" style={{ background: "rgba(255,255,255,0.12)" }}><ClipboardList size={16} /></span>
          Chartwell
        </div>
        <div>
          <div className="headline">{headline}</div>
          <p style={{ color: "#CFE0D6", fontSize: 14.5, marginTop: 16, maxWidth: "34ch", lineHeight: 1.6 }}>{sub}</p>
        </div>
        <div style={{ fontSize: 13, color: "#93A69C" }}>Trusted by dental, general and multi-specialty clinics.</div>
      </div>
      <div className="cw-auth-form-wrap">
        <div className="cw-auth-form">{children}</div>
      </div>
    </div>
  );
}

function LoginPage({ goto, onLogin }) {
  const [email, setEmail] = useState("ananya.rao@riversideclinic.com");
  const [password, setPassword] = useState("");

  return (
    <AuthShell
      headline="Welcome back to your clinic's front desk."
      sub="Today's schedule, patient charts and billing — right where you left them."
    >
      <h2>Log in</h2>
      <p>New here? <a onClick={() => goto("register")} style={{ color: "var(--forest)", fontWeight: 600, cursor: "pointer" }}>Create a clinic account</a></p>
      <form onSubmit={(e) => { e.preventDefault(); onLogin({ name: "Dr. Ananya Rao", clinic: "Riverside Family Clinic" }); }}>
        <div className="cw-field">
          <label>Work email</label>
          <input className="cw-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@yourclinic.com" required />
        </div>
        <div className="cw-field">
          <label>Password</label>
          <input className="cw-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <label className="cw-check-row"><input type="checkbox" defaultChecked style={{ accentColor: "#1E4638" }} /> Keep me logged in</label>
          <a style={{ fontSize: 13, color: "var(--forest)", fontWeight: 600, cursor: "pointer" }}>Forgot password?</a>
        </div>
        <button type="submit" className="cw-btn cw-btn-primary" style={{ width: "100%" }}>Log in <ArrowRight size={16} /></button>
      </form>
      <div className="cw-demo-box">This is a live demo — enter any password to explore Riverside Family Clinic's dashboard with sample patients and appointments already loaded.</div>
    </AuthShell>
  );
}

function RegisterPage({ goto, onRegister }) {
  const [form, setForm] = useState({ clinic: "", name: "", type: "General practice", email: "", password: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell
      headline="Set up a clinic that works the way yours does."
      sub="Dental, general, pediatric or multi-specialty — Chartwell adapts to your practice, not the other way around."
    >
      <h2>Create your clinic</h2>
      <p>Already have an account? <a onClick={() => goto("login")} style={{ color: "var(--forest)", fontWeight: 600, cursor: "pointer" }}>Log in</a></p>
      <form onSubmit={(e) => { e.preventDefault(); onRegister({ name: form.name || "Dr. Ananya Rao", clinic: form.clinic || "Riverside Family Clinic" }); }}>
        <div className="cw-field">
          <label>Clinic name</label>
          <input className="cw-input" value={form.clinic} onChange={set("clinic")} placeholder="Riverside Family Clinic" required />
        </div>
        <div className="cw-row2">
          <div className="cw-field">
            <label>Your name</label>
            <input className="cw-input" value={form.name} onChange={set("name")} placeholder="Dr. Ananya Rao" required />
          </div>
          <div className="cw-field">
            <label>Clinic type</label>
            <select className="cw-select" value={form.type} onChange={set("type")}>
              <option>General practice</option>
              <option>Dental</option>
              <option>Pediatrics</option>
              <option>Physiotherapy</option>
              <option>Multi-specialty</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div className="cw-field">
          <label>Work email</label>
          <input className="cw-input" type="email" value={form.email} onChange={set("email")} placeholder="you@yourclinic.com" required />
        </div>
        <div className="cw-field">
          <label>Password</label>
          <input className="cw-input" type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" required />
        </div>
        <button type="submit" className="cw-btn cw-btn-primary" style={{ width: "100%", marginTop: 6 }}>Create clinic account <ArrowRight size={16} /></button>
      </form>
      <div className="cw-demo-box">This demo signs you in immediately with a sample patient list, appointment calendar and invoices already set up so you can explore right away.</div>
    </AuthShell>
  );
}

/* ============================================================================
   APP SHELL (post-login)
============================================================================ */

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "patients", label: "Patients", icon: Users },
  { key: "appointments", label: "Appointments", icon: Calendar },
  { key: "doctors", label: "Doctors & Staff", icon: Stethoscope },
  { key: "billing", label: "Billing", icon: Receipt },
  { key: "records", label: "Medical Records", icon: FileText },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function Dashboard({ user, onLogout }) {
  const [view, setView] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");

  const [patients, setPatients] = useState(seedPatients);
  const [doctors, setDoctors] = useState(seedDoctors);
  const [appointments, setAppointments] = useState(seedAppointments);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [records, setRecords] = useState(seedRecords);

  const [selectedPatientId, setSelectedPatientId] = useState(null);

  function notify(msg) {
    setToast(msg);
    clearTimeout(window.__cwToastTimer);
    window.__cwToastTimer = setTimeout(() => setToast(""), 2600);
  }

  const ctx = {
    patients, setPatients, doctors, setDoctors, appointments, setAppointments,
    invoices, setInvoices, records, setRecords, notify,
    selectedPatientId, setSelectedPatientId, goToPatients: () => setView("patients"),
    openPatient: (id) => { setSelectedPatientId(id); setView("patients"); },
  };

  const viewTitle = NAV_ITEMS.find(n => n.key === view)?.label || "Overview";

  return (
    <div className="cw">
      <style>{CSS}</style>
      <div className="cw-app">
        <aside className={`cw-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="cw-sidebar-brand">
            <span className="cw-logo-mark"><ClipboardList size={16} /></span>
            Chartwell
          </div>
          <div className="cw-sidebar-clinic">
            <div className="name">{user.clinic}</div>
            <div className="plan">Practice plan</div>
          </div>
          <nav className="cw-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={`cw-nav-item ${view === item.key ? "active" : ""}`}
                onClick={() => { setView(item.key); setSidebarOpen(false); }}
              >
                <item.icon size={17} />{item.label}
              </button>
            ))}
          </nav>
          <div className="cw-sidebar-foot">
            <button className="cw-nav-item" onClick={onLogout}><LogOut size={17} />Log out</button>
          </div>
        </aside>

        <div>
          <div className="cw-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="cw-icon-btn" style={{ display: "none" }} onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={17} /></button>
              <h1>{viewTitle}</h1>
            </div>
            <div className="cw-topbar-actions">
              <div className="cw-topbar-search">
                <Search size={15} color="#8B8A7E" />
                <input placeholder="Search patients…" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && globalSearch.trim()) { setView("patients"); } }} />
              </div>
              <button className="cw-icon-btn"><Bell size={16} /><span className="cw-dot-badge" /></button>
              <div className="cw-avatar">{initials(user.name)}</div>
            </div>
          </div>

          <main className="cw-main">
            {view === "overview" && <OverviewView ctx={ctx} setView={setView} />}
            {view === "patients" && <PatientsView ctx={ctx} initialSearch={globalSearch} />}
            {view === "appointments" && <AppointmentsView ctx={ctx} />}
            {view === "doctors" && <DoctorsView ctx={ctx} />}
            {view === "billing" && <BillingView ctx={ctx} />}
            {view === "records" && <RecordsView ctx={ctx} />}
            {view === "settings" && <SettingsView user={user} ctx={ctx} />}
          </main>
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}

/* ---------------------------- OVERVIEW ---------------------------- */

function OverviewView({ ctx, setView }) {
  const { patients, appointments, invoices, doctors } = ctx;
  const todays = appointments.filter(a => a.date === isoToday);
  const revenueThisMonth = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.items.reduce((a, it) => a + it.amount, 0), 0);
  const pendingAmount = invoices.filter(i => i.status === "unpaid").reduce((s, i) => s + i.items.reduce((a, it) => a + it.amount, 0), 0);

  const trend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const iso = shiftDate(isoToday, -i);
      const count = appointments.filter(a => a.date === iso).length;
      days.push({ day: fmtDateShort(iso), count });
    }
    return days;
  }, [appointments]);

  const revenueByDoctor = useMemo(() => {
    return doctors.map(d => {
      const total = invoices
        .filter(inv => inv.status === "paid" && appointments.some(a => a.patientId === inv.patientId && a.doctorId === d.id))
        .reduce((s, inv) => s + inv.items.reduce((a, it) => a + it.amount, 0), 0);
      return { name: d.name.replace("Dr. ", ""), value: total || 0 };
    }).filter(d => d.value > 0);
  }, [doctors, invoices, appointments]);

  const pieColors = ["#1E4638", "#C8862B", "#386A8A", "#B5432F", "#5C7A67"];

  const stats = [
    { label: "Total patients", value: patients.length, icon: Users, tint: "#DCE7EC", color: "#386A8A", delta: "+3 this week", up: true },
    { label: "Today's appointments", value: todays.length, icon: CalendarClock, tint: "#F3E3C6", color: "#C8862B", delta: `${todays.filter(a => a.status === "completed").length} completed`, up: true },
    { label: "Revenue this month", value: currency(revenueThisMonth), icon: TrendingUp, tint: "#DCEADD", color: "#2E6B3E", delta: "+12% vs last month", up: true },
    { label: "Pending invoices", value: currency(pendingAmount), icon: Receipt, tint: "#F3DBD3", color: "#B5432F", delta: `${invoices.filter(i => i.status === "unpaid").length} unpaid`, up: false },
  ];

  return (
    <div>
      <div className="cw-stat-grid">
        {stats.map(s => (
          <div className="cw-stat-card" key={s.label}>
            <div className="top">
              <div className="icon" style={{ background: s.tint, color: s.color }}><s.icon size={15} /></div>
            </div>
            <div className="val">{s.value}</div>
            <div className="lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="cw-grid-2">
        <div className="cw-panel">
          <div className="cw-panel-head">
            <h3>Appointments, last 7 days</h3>
          </div>
          <div className="cw-panel-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ left: -20, top: 10 }}>
                <defs>
                  <linearGradient id="cwArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E4638" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1E4638" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#DAD6C9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#5C6862" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#5C6862" }} axisLine={false} tickLine={false} allowDecimals={false} width={26} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C9", fontSize: 13 }} />
                <Area type="monotone" dataKey="count" stroke="#1E4638" strokeWidth={2.5} fill="url(#cwArea)" name="Appointments" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cw-panel">
          <div className="cw-panel-head"><h3>Today's schedule</h3></div>
          <div className="cw-panel-body">
            {todays.length === 0 && <div className="cw-empty" style={{ padding: "24px 0" }}><p>No appointments today.</p></div>}
            {todays.slice(0, 5).map(a => {
              const p = ctx.patients.find(pp => pp.id === a.patientId);
              return (
                <div className="cw-list-row" key={a.id}>
                  <div className="cw-avatar" style={{ background: p?.color, width: 32, height: 32, fontSize: 11.5 }}>{initials(p?.name || "?")}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p?.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{fmtTime12(a.time)} · {a.reason}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="cw-grid-2" style={{ marginTop: 16 }}>
        <div className="cw-panel">
          <div className="cw-panel-head">
            <h3>Recently added patients</h3>
            <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => setView("patients")}>View all</button>
          </div>
          <div className="cw-panel-body">
            {patients.slice(-4).reverse().map(p => (
              <div className="cw-list-row" key={p.id} style={{ cursor: "pointer" }} onClick={() => ctx.openPatient(p.id)}>
                <div className="cw-avatar" style={{ background: p.color, width: 32, height: 32, fontSize: 11.5 }}>{initials(p.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.condition}</div>
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--moss)" }}>{fmtDateShort(p.lastVisit)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cw-panel">
          <div className="cw-panel-head"><h3>Revenue by doctor</h3></div>
          <div className="cw-panel-body" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {revenueByDoctor.length > 0 ? (
              <>
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart>
                    <Pie data={revenueByDoctor} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                      {revenueByDoctor.map((entry, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => currency(v)} contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C9", fontSize: 12.5 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {revenueByDoctor.map((d, i) => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: pieColors[i % pieColors.length], flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{d.name}</span>
                      <span className="mono" style={{ color: "var(--ink-soft)" }}>{currency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="cw-empty" style={{ padding: "24px 0", width: "100%" }}><p>No paid invoices yet.</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- PATIENTS ---------------------------- */

function PatientsView({ ctx, initialSearch }) {
  const { patients, setPatients, notify, appointments, records, invoices, doctors, selectedPatientId, setSelectedPatientId } = ctx;
  const [search, setSearch] = useState(initialSearch || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  const selected = patients.find(p => p.id === selectedPatientId);

  function savePatient(data) {
    if (editing) {
      setPatients(patients.map(p => p.id === editing.id ? { ...p, ...data } : p));
      notify("Patient details updated");
    } else {
      const id = "P-" + (1000 + patients.length + Math.floor(Math.random() * 90));
      setPatients([...patients, { id, lastVisit: isoToday, color: ["#1E4638", "#386A8A", "#C8862B", "#B5432F", "#5C7A67"][patients.length % 5], ...data }]);
      notify("Patient added");
    }
    setModalOpen(false);
    setEditing(null);
  }

  function deletePatient(id) {
    setPatients(patients.filter(p => p.id !== id));
    if (selectedPatientId === id) setSelectedPatientId(null);
    setConfirmDelete(null);
    notify("Patient removed");
  }

  return (
    <div>
      <div className="cw-toolbar">
        <div className="cw-toolbar-left">
          <div className="cw-search-box">
            <Search size={15} color="#8B8A7E" />
            <input placeholder="Search by name, ID or phone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{filtered.length} patients</span>
        </div>
        <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={15} />Add patient</button>
      </div>

      <div className="cw-panel">
        {filtered.length === 0 ? (
          <div className="cw-empty">
            <div className="icon"><Users size={20} /></div>
            <h4>No patients found</h4>
            <p>Try a different search, or add a new patient to get started.</p>
            <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => setModalOpen(true)}><Plus size={15} />Add patient</button>
          </div>
        ) : (
          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead>
                <tr><th>Patient</th><th>Age / Gender</th><th>Contact</th><th>Condition</th><th>Last visit</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="clickable" onClick={() => setSelectedPatientId(p.id)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="cw-avatar" style={{ background: p.color, width: 32, height: 32, fontSize: 11.5 }}>{initials(p.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div className="mono" style={{ fontSize: 11.5, color: "var(--moss)" }}>{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.age} · {p.gender}</td>
                    <td>{p.phone}</td>
                    <td>{p.condition}</td>
                    <td className="num">{fmtDateShort(p.lastVisit)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => { setEditing(p); setModalOpen(true); }}><Pencil size={14} /></button>
                        <button className="cw-btn cw-btn-danger cw-btn-icon" onClick={() => setConfirmDelete(p)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <PatientModal
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={savePatient}
        />
      )}

      {confirmDelete && (
        <div className="cw-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="cw-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="cw-modal-head"><h3>Remove patient?</h3></div>
            <div className="cw-modal-body">
              <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0 }}>This removes <b>{confirmDelete.name}</b> and their record from your patient list. Appointment and billing history tied to them will remain but won't be linked to a chart.</p>
            </div>
            <div className="cw-modal-foot">
              <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="cw-btn cw-btn-danger cw-btn-sm" onClick={() => deletePatient(confirmDelete.id)}>Remove patient</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <PatientDrawer
          patient={selected}
          appointments={appointments.filter(a => a.patientId === selected.id)}
          records={records.filter(r => r.patientId === selected.id)}
          invoices={invoices.filter(i => i.patientId === selected.id)}
          doctors={doctors}
          onClose={() => setSelectedPatientId(null)}
          onEdit={() => { setEditing(selected); setModalOpen(true); setSelectedPatientId(null); }}
        />
      )}
    </div>
  );
}

function PatientModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { name: "", age: "", gender: "Female", phone: "", email: "", address: "", bloodGroup: "O+", allergies: "", condition: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-head">
          <h3>{initial ? "Edit patient" : "Add patient"}</h3>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, age: Number(form.age) }); }}>
          <div className="cw-modal-body">
            <div className="cw-field"><label>Full name</label><input className="cw-input" value={form.name} onChange={set("name")} required placeholder="Jordan Lee" /></div>
            <div className="cw-row2">
              <div className="cw-field"><label>Age</label><input className="cw-input" type="number" min="0" value={form.age} onChange={set("age")} required /></div>
              <div className="cw-field"><label>Gender</label>
                <select className="cw-select" value={form.gender} onChange={set("gender")}>
                  <option>Female</option><option>Male</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="cw-row2">
              <div className="cw-field"><label>Phone</label><input className="cw-input" value={form.phone} onChange={set("phone")} required placeholder="+91 90000 00000" /></div>
              <div className="cw-field"><label>Email</label><input className="cw-input" type="email" value={form.email} onChange={set("email")} placeholder="patient@mail.com" /></div>
            </div>
            <div className="cw-field"><label>Address</label><input className="cw-input" value={form.address} onChange={set("address")} placeholder="Street, city" /></div>
            <div className="cw-row2">
              <div className="cw-field"><label>Blood group</label>
                <select className="cw-select" value={form.bloodGroup} onChange={set("bloodGroup")}>
                  {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="cw-field"><label>Known allergies</label><input className="cw-input" value={form.allergies} onChange={set("allergies")} placeholder="None known" /></div>
            </div>
            <div className="cw-field"><label>Current condition / reason on file</label><input className="cw-input" value={form.condition} onChange={set("condition")} placeholder="e.g. Annual physical" /></div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm">{initial ? "Save changes" : "Add patient"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PatientDrawer({ patient, appointments, records, invoices, doctors, onClose, onEdit }) {
  const [tab, setTab] = useState("history");
  const docName = (id) => doctors.find(d => d.id === id)?.name || "—";

  return (
    <div className="cw-drawer-overlay" onClick={onClose}>
      <div className="cw-drawer" onClick={e => e.stopPropagation()}>
        <div className="cw-drawer-head">
          <div style={{ display: "flex", gap: 14 }}>
            <div className="cw-avatar" style={{ background: patient.color, width: 50, height: 50, fontSize: 16 }}>{initials(patient.name)}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{patient.name}</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--moss)" }}>{patient.id}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{patient.age} yrs · {patient.gender} · {patient.bloodGroup}</div>
            </div>
          </div>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="cw-drawer-body">
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={onEdit}><Pencil size={13} />Edit</button>
          </div>

          <div className="cw-panel" style={{ marginBottom: 18 }}>
            <div className="cw-panel-body">
              <div className="cw-list-row"><Phone size={14} color="var(--moss)" /><span>{patient.phone}</span></div>
              <div className="cw-list-row"><Mail size={14} color="var(--moss)" /><span>{patient.email || "No email on file"}</span></div>
              <div className="cw-list-row"><MapPin size={14} color="var(--moss)" /><span>{patient.address || "No address on file"}</span></div>
              <div className="cw-list-row"><Droplet size={14} color="var(--moss)" /><span>Allergies: {patient.allergies || "None known"}</span></div>
            </div>
          </div>

          <div className="cw-tabs" style={{ marginBottom: 16 }}>
            <button className={`cw-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>Visit history</button>
            <button className={`cw-tab ${tab === "records" ? "active" : ""}`} onClick={() => setTab("records")}>Medical records</button>
            <button className={`cw-tab ${tab === "billing" ? "active" : ""}`} onClick={() => setTab("billing")}>Billing</button>
          </div>

          {tab === "history" && (
            appointments.length === 0 ? <div className="cw-empty"><p>No appointments on file.</p></div> :
            appointments.sort((a, b) => b.date.localeCompare(a.date)).map(a => (
              <div className="cw-list-row" key={a.id}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.reason}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{docName(a.doctorId)} · {fmtDate(a.date)}, {fmtTime12(a.time)}</div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))
          )}

          {tab === "records" && (
            records.length === 0 ? <div className="cw-empty"><p>No medical records yet.</p></div> :
            records.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
              <div className="cw-record-card" key={r.id}>
                <div className="rhead">
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{r.diagnosis}</span>
                  <span className="rdate">{fmtDateShort(r.date)}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 4 }}><b>Prescription:</b> {r.prescription}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{r.notes}</div>
                <div style={{ fontSize: 11.5, color: "var(--moss)", marginTop: 8 }}>{docName(r.doctorId)}</div>
              </div>
            ))
          )}

          {tab === "billing" && (
            invoices.length === 0 ? <div className="cw-empty"><p>No invoices for this patient.</p></div> :
            invoices.sort((a, b) => b.date.localeCompare(a.date)).map(inv => {
              const total = inv.items.reduce((s, it) => s + it.amount, 0);
              return (
                <div className="cw-list-row" key={inv.id}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }} className="mono">{inv.id}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{fmtDate(inv.date)} · {inv.items.map(it => it.desc).join(", ")}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>{currency(total)}</div>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- APPOINTMENTS ---------------------------- */

function AppointmentsView({ ctx }) {
  const { appointments, setAppointments, patients, doctors, notify } = ctx;
  const [mode, setMode] = useState("calendar");
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(isoToday);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const year = monthCursor.getFullYear(), month = monthCursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ d: daysInPrevMonth - i, muted: true, iso: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, muted: false, iso: toISO(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ d: cells.length, muted: true, iso: null });

  const dayAppointments = appointments.filter(a => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const listFiltered = appointments
    .filter(a => statusFilter === "all" || a.status === statusFilter)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  function saveAppointment(data) {
    if (editing) {
      setAppointments(appointments.map(a => a.id === editing.id ? { ...a, ...data } : a));
      notify("Appointment updated");
    } else {
      const id = "A-" + (3000 + appointments.length + Math.floor(Math.random() * 90));
      setAppointments([...appointments, { id, status: "scheduled", ...data }]);
      notify("Appointment scheduled");
    }
    setModalOpen(false);
    setEditing(null);
  }

  function setStatus(id, status) {
    setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
    notify(`Marked as ${status}`);
  }

  const patientName = (id) => patients.find(p => p.id === id)?.name || "Unknown";
  const doctorName = (id) => doctors.find(d => d.id === id)?.name || "Unknown";

  return (
    <div>
      <div className="cw-toolbar">
        <div className="cw-tabs">
          <button className={`cw-tab ${mode === "calendar" ? "active" : ""}`} onClick={() => setMode("calendar")}><LayoutGrid size={14} />Calendar</button>
          <button className={`cw-tab ${mode === "list" ? "active" : ""}`} onClick={() => setMode("list")}><ListIcon size={14} />List</button>
        </div>
        <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={15} />New appointment</button>
      </div>

      {mode === "calendar" ? (
        <div className="cw-grid-2">
          <div className="cw-panel">
            <div className="cw-panel-head">
              <h3>{monthCursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h3>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}><ChevronLeft size={15} /></button>
                <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}><ChevronRight size={15} /></button>
              </div>
            </div>
            <div className="cw-panel-body">
              <div className="cw-cal-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div className="cw-cal-dow" key={d}>{d}</div>)}
                {cells.map((c, i) => {
                  const count = c.iso ? appointments.filter(a => a.date === c.iso).length : 0;
                  return (
                    <div
                      key={i}
                      className={`cw-cal-cell ${c.muted ? "muted" : ""} ${c.iso === isoToday ? "today" : ""} ${c.iso === selectedDate ? "selected" : ""}`}
                      onClick={() => c.iso && setSelectedDate(c.iso)}
                    >
                      <div className="cw-cal-daynum">{c.d}</div>
                      {count > 0 && <span className="cw-cal-pip">{count} visit{count > 1 ? "s" : ""}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="cw-panel">
            <div className="cw-panel-head"><h3>{fmtDate(selectedDate)}</h3></div>
            <div className="cw-panel-body">
              {dayAppointments.length === 0 ? (
                <div className="cw-empty" style={{ padding: "20px 0" }}><p>Nothing scheduled this day.</p></div>
              ) : dayAppointments.map(a => (
                <div className="cw-list-row" key={a.id} style={{ alignItems: "flex-start" }}>
                  <div className="mono" style={{ fontSize: 12, color: "var(--moss)", width: 64, flexShrink: 0, paddingTop: 2 }}>{fmtTime12(a.time)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{patientName(a.patientId)}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{doctorName(a.doctorId)} · {a.reason}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <StatusBadge status={a.status} />
                      {a.status === "scheduled" && <>
                        <button className="cw-btn cw-btn-ghost cw-btn-sm" style={{ padding: "3px 9px", fontSize: 11.5 }} onClick={() => setStatus(a.id, "completed")}>Mark completed</button>
                        <button className="cw-btn cw-btn-ghost cw-btn-sm" style={{ padding: "3px 9px", fontSize: 11.5 }} onClick={() => { setEditing(a); setModalOpen(true); }}>Edit</button>
                      </>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="cw-panel">
          <div className="cw-panel-head">
            <h3>All appointments</h3>
            <div className="cw-chip-filter">
              {["all", "scheduled", "completed", "cancelled", "noshow"].map(s => (
                <button key={s} className={`cw-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s === "all" ? "All" : s === "noshow" ? "No-show" : s[0].toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead><tr><th>Patient</th><th>Doctor</th><th>Date & time</th><th>Reason</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {listFiltered.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{patientName(a.patientId)}</td>
                    <td>{doctorName(a.doctorId)}</td>
                    <td className="num">{fmtDateShort(a.date)}, {fmtTime12(a.time)}</td>
                    <td>{a.reason}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => { setEditing(a); setModalOpen(true); }}><Pencil size={13} /></button>
                        {a.status === "scheduled" && <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setStatus(a.id, "cancelled")}><X size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <AppointmentModal
          initial={editing}
          patients={patients}
          doctors={doctors}
          defaultDate={selectedDate}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={saveAppointment}
        />
      )}
    </div>
  );
}

function AppointmentModal({ initial, patients, doctors, defaultDate, onClose, onSave }) {
  const [form, setForm] = useState(initial || {
    patientId: patients[0]?.id || "", doctorId: doctors[0]?.id || "", date: defaultDate, time: "09:00", duration: 30, reason: "", status: "scheduled",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-head">
          <h3>{initial ? "Edit appointment" : "New appointment"}</h3>
          <button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, duration: Number(form.duration) }); }}>
          <div className="cw-modal-body">
            <div className="cw-field"><label>Patient</label>
              <select className="cw-select" value={form.patientId} onChange={set("patientId")} required>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="cw-field"><label>Doctor</label>
              <select className="cw-select" value={form.doctorId} onChange={set("doctorId")} required>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
              </select>
            </div>
            <div className="cw-row2">
              <div className="cw-field"><label>Date</label><input className="cw-input" type="date" value={form.date} onChange={set("date")} required /></div>
              <div className="cw-field"><label>Time</label><input className="cw-input" type="time" value={form.time} onChange={set("time")} required /></div>
            </div>
            <div className="cw-row2">
              <div className="cw-field"><label>Duration (minutes)</label>
                <select className="cw-select" value={form.duration} onChange={set("duration")}>
                  {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div className="cw-field"><label>Status</label>
                <select className="cw-select" value={form.status} onChange={set("status")}>
                  <option value="scheduled">Scheduled</option><option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option><option value="noshow">No-show</option>
                </select>
              </div>
            </div>
            <div className="cw-field"><label>Reason for visit</label><input className="cw-input" value={form.reason} onChange={set("reason")} required placeholder="e.g. Annual checkup" /></div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm">{initial ? "Save changes" : "Schedule appointment"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------- DOCTORS ---------------------------- */

function DoctorsView({ ctx }) {
  const { doctors, setDoctors, appointments, notify } = ctx;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function save(data) {
    if (editing) {
      setDoctors(doctors.map(d => d.id === editing.id ? { ...d, ...data } : d));
      notify("Staff details updated");
    } else {
      setDoctors([...doctors, { id: "D-" + (10 + doctors.length), ...data }]);
      notify("Staff member added");
    }
    setModalOpen(false); setEditing(null);
  }
  function remove(id) {
    setDoctors(doctors.filter(d => d.id !== id));
    notify("Staff member removed");
  }

  return (
    <div>
      <div className="cw-toolbar">
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{doctors.length} staff members</span>
        <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={15} />Add doctor / staff</button>
      </div>
      <div className="cw-doctor-grid">
        {doctors.map(d => {
          const load = appointments.filter(a => a.doctorId === d.id && a.status === "scheduled").length;
          return (
            <div className="cw-doctor-card" key={d.id}>
              <div className="head">
                <div className="cw-avatar" style={{ width: 42, height: 42 }}>{initials(d.name)}</div>
                <div>
                  <div className="name">{d.name}</div>
                  <div className="spec">{d.specialty}</div>
                </div>
              </div>
              <div className="row"><Phone size={13} />{d.phone}</div>
              <div className="row"><Mail size={13} />{d.email}</div>
              <div className="row"><CalendarClock size={13} />{load} upcoming appointment{load !== 1 ? "s" : ""}</div>
              <div className="days">
                {allDays.map(day => <span key={day} className={`cw-daychip ${d.days.includes(day) ? "on" : ""}`}>{day}</span>)}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                <button className="cw-btn cw-btn-ghost cw-btn-sm" style={{ flex: 1 }} onClick={() => { setEditing(d); setModalOpen(true); }}><Pencil size={13} />Edit</button>
                <button className="cw-btn cw-btn-danger cw-btn-icon" onClick={() => remove(d.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <DoctorModal initial={editing} allDays={allDays} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={save} />
      )}
    </div>
  );
}

function DoctorModal({ initial, allDays, onClose, onSave }) {
  const [form, setForm] = useState(initial || { name: "", specialty: "", phone: "", email: "", days: [] });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  function toggleDay(day) {
    setForm(f => ({ ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day] }));
  }
  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-head"><h3>{initial ? "Edit staff member" : "Add doctor / staff"}</h3><button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose}><X size={16} /></button></div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <div className="cw-modal-body">
            <div className="cw-field"><label>Full name</label><input className="cw-input" value={form.name} onChange={set("name")} required placeholder="Dr. Jamie Cole" /></div>
            <div className="cw-field"><label>Specialty / role</label><input className="cw-input" value={form.specialty} onChange={set("specialty")} required placeholder="e.g. Dental Surgeon, Front Desk" /></div>
            <div className="cw-row2">
              <div className="cw-field"><label>Phone</label><input className="cw-input" value={form.phone} onChange={set("phone")} required /></div>
              <div className="cw-field"><label>Email</label><input className="cw-input" type="email" value={form.email} onChange={set("email")} required /></div>
            </div>
            <div className="cw-field">
              <label>Working days</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allDays.map(day => (
                  <button type="button" key={day} className={`cw-chip ${form.days.includes(day) ? "active" : ""}`} onClick={() => toggleDay(day)}>{day}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm">{initial ? "Save changes" : "Add staff member"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------- BILLING ---------------------------- */

function BillingView({ ctx }) {
  const { invoices, setInvoices, patients, notify } = ctx;
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.items.reduce((a, it) => a + it.amount, 0), 0);
  const totalPending = invoices.filter(i => i.status === "unpaid").reduce((s, i) => s + i.items.reduce((a, it) => a + it.amount, 0), 0);
  const patientName = (id) => patients.find(p => p.id === id)?.name || "Unknown";

  const filtered = invoices.filter(i => statusFilter === "all" || i.status === statusFilter).sort((a, b) => b.date.localeCompare(a.date));

  function markPaid(id) {
    setInvoices(invoices.map(i => i.id === id ? { ...i, status: "paid" } : i));
    notify("Invoice marked as paid");
  }
  function createInvoice(data) {
    const id = "INV-" + (2200 + invoices.length + Math.floor(Math.random() * 90));
    setInvoices([...invoices, { id, status: "unpaid", ...data }]);
    notify("Invoice created");
    setModalOpen(false);
  }

  return (
    <div>
      <div className="cw-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="cw-stat-card">
          <div className="val">{currency(totalRevenue)}</div><div className="lbl">Total collected</div>
        </div>
        <div className="cw-stat-card">
          <div className="val">{currency(totalPending)}</div><div className="lbl">Pending collection</div>
        </div>
        <div className="cw-stat-card">
          <div className="val">{invoices.length}</div><div className="lbl">Total invoices</div>
        </div>
      </div>

      <div className="cw-toolbar">
        <div className="cw-chip-filter">
          {["all", "paid", "unpaid"].map(s => (
            <button key={s} className={`cw-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => setModalOpen(true)}><Plus size={15} />New invoice</button>
      </div>

      <div className="cw-panel">
        <div className="cw-table-wrap">
          <table className="cw-table">
            <thead><tr><th>Invoice</th><th>Patient</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(inv => {
                const total = inv.items.reduce((s, it) => s + it.amount, 0);
                return (
                  <tr key={inv.id}>
                    <td className="mono">{inv.id}</td>
                    <td style={{ fontWeight: 600 }}>{patientName(inv.patientId)}</td>
                    <td className="num">{fmtDateShort(inv.date)}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{inv.items.map(it => it.desc).join(", ")}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{currency(total)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>{inv.status === "unpaid" && <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => markPaid(inv.id)}>Mark paid</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && <InvoiceModal patients={patients} onClose={() => setModalOpen(false)} onSave={createInvoice} />}
    </div>
  );
}

function InvoiceModal({ patients, onClose, onSave }) {
  const [patientId, setPatientId] = useState(patients[0]?.id || "");
  const [date, setDate] = useState(isoToday);
  const [items, setItems] = useState([{ desc: "", amount: "" }]);

  function updateItem(i, key, val) {
    const next = [...items]; next[i] = { ...next[i], [key]: val }; setItems(next);
  }
  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-head"><h3>New invoice</h3><button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose}><X size={16} /></button></div>
        <form onSubmit={e => {
          e.preventDefault();
          onSave({ patientId, date, items: items.filter(it => it.desc && it.amount).map(it => ({ desc: it.desc, amount: Number(it.amount) })) });
        }}>
          <div className="cw-modal-body">
            <div className="cw-row2">
              <div className="cw-field"><label>Patient</label>
                <select className="cw-select" value={patientId} onChange={e => setPatientId(e.target.value)} required>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="cw-field"><label>Date</label><input className="cw-input" type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            </div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>Line items</label>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input className="cw-input" placeholder="Description" value={it.desc} onChange={e => updateItem(i, "desc", e.target.value)} style={{ flex: 2 }} />
                <input className="cw-input" type="number" placeholder="Amount" value={it.amount} onChange={e => updateItem(i, "amount", e.target.value)} style={{ flex: 1 }} />
                {items.length > 1 && <button type="button" className="cw-btn cw-btn-ghost cw-btn-icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><X size={14} /></button>}
              </div>
            ))}
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => setItems([...items, { desc: "", amount: "" }])}><Plus size={13} />Add line item</button>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>Total</span><span className="mono">{currency(total)}</span>
            </div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm">Create invoice</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------- MEDICAL RECORDS ---------------------------- */

function RecordsView({ ctx }) {
  const { records, setRecords, patients, doctors, notify } = ctx;
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const patientName = (id) => patients.find(p => p.id === id)?.name || "Unknown";
  const doctorName = (id) => doctors.find(d => d.id === id)?.name || "Unknown";

  const filtered = records
    .filter(r => patientName(r.patientId).toLowerCase().includes(search.toLowerCase()) || r.diagnosis.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  function saveRecord(data) {
    const id = "R-" + (900 + records.length + Math.floor(Math.random() * 90));
    setRecords([...records, { id, ...data }]);
    notify("Medical record added");
    setModalOpen(false);
  }

  return (
    <div>
      <div className="cw-toolbar">
        <div className="cw-search-box">
          <Search size={15} color="#8B8A7E" />
          <input placeholder="Search by patient or diagnosis…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => setModalOpen(true)}><Plus size={15} />New record</button>
      </div>

      {filtered.length === 0 ? (
        <div className="cw-panel"><div className="cw-empty">
          <div className="icon"><FileText size={20} /></div>
          <h4>No medical records found</h4>
          <p>Records added during a visit will appear here, organized by patient.</p>
        </div></div>
      ) : filtered.map(r => (
        <div className="cw-record-card" key={r.id}>
          <div className="rhead">
            <div>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>{patientName(r.patientId)}</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)", marginLeft: 8 }}>{r.diagnosis}</span>
            </div>
            <span className="rdate">{fmtDate(r.date)}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 4 }}><b>Prescription:</b> {r.prescription}</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{r.notes}</div>
          <div style={{ fontSize: 11.5, color: "var(--moss)", marginTop: 8 }}>{doctorName(r.doctorId)}</div>
        </div>
      ))}

      {modalOpen && <RecordModal patients={patients} doctors={doctors} onClose={() => setModalOpen(false)} onSave={saveRecord} />}
    </div>
  );
}

function RecordModal({ patients, doctors, onClose, onSave }) {
  const [form, setForm] = useState({ patientId: patients[0]?.id || "", doctorId: doctors[0]?.id || "", date: isoToday, diagnosis: "", prescription: "", notes: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-modal-head"><h3>New medical record</h3><button className="cw-btn cw-btn-ghost cw-btn-icon" onClick={onClose}><X size={16} /></button></div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <div className="cw-modal-body">
            <div className="cw-row2">
              <div className="cw-field"><label>Patient</label>
                <select className="cw-select" value={form.patientId} onChange={set("patientId")}>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </div>
              <div className="cw-field"><label>Doctor</label>
                <select className="cw-select" value={form.doctorId} onChange={set("doctorId")}>{doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
              </div>
            </div>
            <div className="cw-field"><label>Date</label><input className="cw-input" type="date" value={form.date} onChange={set("date")} /></div>
            <div className="cw-field"><label>Diagnosis</label><input className="cw-input" value={form.diagnosis} onChange={set("diagnosis")} required placeholder="e.g. Acute bronchitis" /></div>
            <div className="cw-field"><label>Prescription</label><input className="cw-input" value={form.prescription} onChange={set("prescription")} placeholder="e.g. Azithromycin 500mg, once daily, 3 days" /></div>
            <div className="cw-field"><label>Clinical notes</label><textarea className="cw-textarea" rows={4} value={form.notes} onChange={set("notes")} placeholder="Observations, vitals, follow-up plan…" /></div>
          </div>
          <div className="cw-modal-foot">
            <button type="button" className="cw-btn cw-btn-ghost cw-btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="cw-btn cw-btn-primary cw-btn-sm">Save record</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------- SETTINGS ---------------------------- */

function SettingsView({ user, ctx }) {
  const [tab, setTab] = useState("clinic");
  const [clinic, setClinic] = useState({ name: user.clinic, type: "General practice", phone: "+91 98111 22233", address: "22 Riverside Road, Panipat, Haryana", openTime: "09:00", closeTime: "18:00" });
  const [notifs, setNotifs] = useState({ appointmentReminders: true, dailySummary: true, invoiceAlerts: false });

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="cw-tabs" style={{ marginBottom: 20 }}>
        <button className={`cw-tab ${tab === "clinic" ? "active" : ""}`} onClick={() => setTab("clinic")}>Clinic profile</button>
        <button className={`cw-tab ${tab === "account" ? "active" : ""}`} onClick={() => setTab("account")}>Account</button>
        <button className={`cw-tab ${tab === "notifs" ? "active" : ""}`} onClick={() => setTab("notifs")}>Notifications</button>
      </div>

      {tab === "clinic" && (
        <div className="cw-panel">
          <div className="cw-panel-head"><h3>Clinic profile</h3></div>
          <div className="cw-panel-body">
            <div className="cw-field"><label>Clinic name</label><input className="cw-input" value={clinic.name} onChange={e => setClinic({ ...clinic, name: e.target.value })} /></div>
            <div className="cw-field"><label>Clinic type</label>
              <select className="cw-select" value={clinic.type} onChange={e => setClinic({ ...clinic, type: e.target.value })}>
                <option>General practice</option><option>Dental</option><option>Pediatrics</option><option>Physiotherapy</option><option>Multi-specialty</option>
              </select>
            </div>
            <div className="cw-field"><label>Phone</label><input className="cw-input" value={clinic.phone} onChange={e => setClinic({ ...clinic, phone: e.target.value })} /></div>
            <div className="cw-field"><label>Address</label><input className="cw-input" value={clinic.address} onChange={e => setClinic({ ...clinic, address: e.target.value })} /></div>
            <div className="cw-row2">
              <div className="cw-field"><label>Opens at</label><input className="cw-input" type="time" value={clinic.openTime} onChange={e => setClinic({ ...clinic, openTime: e.target.value })} /></div>
              <div className="cw-field"><label>Closes at</label><input className="cw-input" type="time" value={clinic.closeTime} onChange={e => setClinic({ ...clinic, closeTime: e.target.value })} /></div>
            </div>
            <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => ctx.notify("Clinic profile saved")}>Save changes</button>
          </div>
        </div>
      )}

      {tab === "account" && (
        <div className="cw-panel">
          <div className="cw-panel-head"><h3>Your account</h3></div>
          <div className="cw-panel-body">
            <div className="cw-field"><label>Name</label><input className="cw-input" defaultValue={user.name} /></div>
            <div className="cw-field"><label>Email</label><input className="cw-input" type="email" defaultValue="ananya.rao@riversideclinic.com" /></div>
            <div className="cw-field"><label>New password</label><input className="cw-input" type="password" placeholder="Leave blank to keep current password" /></div>
            <button className="cw-btn cw-btn-primary cw-btn-sm" onClick={() => ctx.notify("Account details saved")}>Save changes</button>
            <hr className="cw-rule" style={{ margin: "22px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Export clinic data</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Download all patients, appointments and invoices as CSV.</div>
              </div>
              <button className="cw-btn cw-btn-ghost cw-btn-sm" onClick={() => ctx.notify("Export started — check your downloads")}>Export</button>
            </div>
          </div>
        </div>
      )}

      {tab === "notifs" && (
        <div className="cw-panel">
          <div className="cw-panel-head"><h3>Notification preferences</h3></div>
          <div className="cw-panel-body">
            {[
              { key: "appointmentReminders", label: "Appointment reminders", desc: "Get notified an hour before each scheduled visit." },
              { key: "dailySummary", label: "Daily summary", desc: "A morning email with the day's full schedule." },
              { key: "invoiceAlerts", label: "Invoice alerts", desc: "Get notified when an invoice is marked unpaid for 7+ days." },
            ].map(n => (
              <div key={n.key} className="cw-list-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.label}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{n.desc}</div>
                </div>
                <button
                  onClick={() => setNotifs({ ...notifs, [n.key]: !notifs[n.key] })}
                  style={{ width: 40, height: 22, borderRadius: 20, border: "none", background: notifs[n.key] ? "#1E4638" : "#DAD6C9", position: "relative", flexShrink: 0, cursor: "pointer" }}
                >
                  <span style={{ position: "absolute", top: 2, left: notifs[n.key] ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s ease" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   ROOT APP
============================================================================ */

export default function App() {
  const [route, setRoute] = useState("landing");
  const [user, setUser] = useState(null);

  function handleAuth(u) {
    setUser(u);
    setRoute("app");
  }
  function handleLogout() {
    setUser(null);
    setRoute("landing");
  }

  if (route === "app" && user) return <Dashboard user={user} onLogout={handleLogout} />;
  if (route === "login") return <LoginPage goto={setRoute} onLogin={handleAuth} />;
  if (route === "register") return <RegisterPage goto={setRoute} onRegister={handleAuth} />;
  return <LandingPage goto={setRoute} />;
}
