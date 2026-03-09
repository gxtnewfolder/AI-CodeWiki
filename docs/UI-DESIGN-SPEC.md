# UI Design Spec: AI-CodeWiki

> Design system grounded in refero-design skill principles. IDE-like interface for developers.

---

## Design Brief

**WHAT:** IDE-like web app with sidebar file tree + markdown summary viewer  
**WHO:** Developers (2-4 people), technical audience  
**GOAL:** Read & understand codebases faster with AI summaries  
**TONE:** Professional, dev-focused, clean, functional  
**JOB:** "Show me what this code does, fast"  
**OBJECTION:** "Will it be slow/wasteful with AI tokens?"  
**HOOK:** One-click file summary with smart caching  
**CONSTRAINTS:** Angular v20+ + spartan-ng + Tailwind v4, Dark/Light mode

---

## Design References (Without Refero MCP)

Based on best-in-class IDE/documentation tools:

| Reference | What to Learn |
|-----------|---------------|
| **VS Code** | Sidebar file tree, resizable panels, dark theme elevation |
| **Cursor IDE** | AI-augmented editor, sidebar tabs, command palette |
| **Linear** | Clean sidebar, tight typography, teal accent, dark mode |
| **Notion** | Markdown rendering, sidebar hierarchy, clean spacing |
| **GitHub** | File tree, markdown rendering, dark/light theme system |
| **Mintlify** | Documentation layout, code syntax highlighting |

> 📌 เมื่อ Refero MCP subscription active ให้กลับมาทำ deep research ด้วย queries:
> - `"code editor sidebar file tree dark mode"`
> - `"documentation viewer markdown"`
> - `"settings page API key configuration"`
> - `"Linear"`, `"Notion"`, `"VS Code"`
> - `"command palette search"`

---

## Typography System

### Font Pairing (Dev Tool Standard)

| Role | Font | Why |
|------|------|-----|
| **UI / Body** | Inter (Variable) | Safe SaaS preset, excellent readability at all sizes |
| **Code / Mono** | JetBrains Mono | Industry standard for code, ligature support |

### Type Scale (Minor Third × 16px)

| Token | Size | Use | Weight | Line Height | Letter Spacing |
|-------|------|-----|--------|-------------|----------------|
| `text-xs` | 11px | Captions, timestamps | 400-500 | 1.4 | `0.02em` |
| `text-sm` | 13px | Metadata, sidebar labels | 400-500 | 1.4 | `0.01em` |
| `text-base` | 16px | Body text, descriptions | 400 | 1.55 | `0` |
| `text-lg` | 19px | Lead text, highlights | 400-500 | 1.5 | `0` |
| `text-xl` | 23px | Section headings (H3) | 600 | 1.3 | `0` |
| `text-2xl` | 28px | Page headings (H2) | 600 | 1.2 | `-0.01em` |
| `text-3xl` | 33px | Summary title (H1) | 600 | 1.15 | `-0.02em` |

### Weight Rules

| Weight | Use |
|--------|-----|
| 400 (Regular) | Body text, descriptions, file names |
| 500 (Medium) | UI labels, active sidebar item, badges |
| 600 (Semibold) | Headings, buttons, section titles |

### Text Rules

- **Max line length:** `65ch` for markdown content
- **ALL CAPS:** Always with `letter-spacing: 0.08em` (sidebar section labels)
- **Code blocks:** JetBrains Mono, 14px, `letter-spacing: 0`
- **Headings:** `text-wrap: balance`
- **Numbers:** `font-variant-numeric: tabular-nums` for file sizes, stats

---

## Color System

### Primary Accent: Teal (NOT indigo/violet)

> ⛔ **Indigo BANNED** — Every AI defaults to indigo `#6366f1`. We use **Teal** for distinction.

**Why Teal:** Fresh, modern, distinctive. Works great for dev tools. Good contrast on both light/dark.

### Light Theme Tokens

```css
:root {
  /* Neutrals (cool) */
  --bg: #fafafa;
  --surface-1: #ffffff;
  --surface-2: #f5f5f5;
  --surface-3: #ebebeb;
  
  /* Text */
  --text: #0b0b0b;
  --text-muted: #525252;
  --text-subtle: #737373;
  --text-disabled: #a3a3a3;
  
  /* Borders */
  --border: #e5e5e5;
  --border-strong: #d4d4d4;
  
  /* Primary (Teal) */
  --primary-50: #f0fdfa;
  --primary-100: #ccfbf1;
  --primary-200: #99f6e4;
  --primary-500: #14b8a6;
  --primary-600: #0d9488;
  --primary-700: #0f766e;
  --primary-800: #115e59;
  
  --primary: var(--primary-600);          /* #0d9488 */
  --primary-hover: var(--primary-700);    /* #0f766e */
  --primary-active: var(--primary-800);   /* #115e59 */
  --primary-tint: var(--primary-50);      /* Background tint */
  --on-primary: #ffffff;
  
  /* Semantic */
  --success: #16a34a;
  --success-bg: #f0fdf4;
  --warning: #f59e0b;
  --warning-bg: #fffbeb;
  --danger: #ef4444;
  --danger-bg: #fef2f2;
  --info: #0ea5e9;
  --info-bg: #f0f9ff;
  
  /* Sidebar */
  --sidebar-bg: #f9fafb;
  --sidebar-active: var(--primary-tint);
  --sidebar-hover: #f3f4f6;
}
```

### Dark Theme Tokens (Separate, NOT inverted)

```css
[data-theme="dark"] {
  color-scheme: dark;
  
  /* Neutrals */
  --bg: #0f0f0f;
  --surface-1: #171717;
  --surface-2: #1f1f1f;
  --surface-3: #262626;
  
  /* Text */
  --text: #f5f5f5;
  --text-muted: #a3a3a3;
  --text-subtle: #737373;
  --text-disabled: #525252;
  
  /* Borders */
  --border: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(255, 255, 255, 0.15);
  
  /* Primary (Teal - adjusted for dark) */
  --primary: #2dd4bf;
  --primary-hover: #14b8a6;
  --primary-active: #0d9488;
  --primary-tint: rgba(45, 212, 191, 0.12);
  --on-primary: #0f0f0f;
  
  /* Semantic (with alpha backgrounds) */
  --success-bg: rgba(22, 163, 74, 0.15);
  --warning-bg: rgba(245, 158, 11, 0.15);
  --danger-bg: rgba(239, 68, 68, 0.15);
  --info-bg: rgba(14, 165, 233, 0.15);
  
  /* Sidebar */
  --sidebar-bg: #141414;
  --sidebar-active: var(--primary-tint);
  --sidebar-hover: #1a1a1a;
}
```

### Color Distribution

| Percentage | Elements |
|------------|----------|
| 70-85% | Neutrals (bg, surfaces, borders) |
| 10-15% | Text hierarchy (primary → muted → subtle) |
| 5-10% | Teal accent + semantic colors |

---

## Spacing System

**Base unit: 4px** — Everything multiplies from this.

```
4px  — Tight inner padding, icon gaps
8px  — Default inner padding, small gaps
12px — Between related items
16px — Default component padding
24px — Between sections within panel
32px — Between major sections
48px — Large section gaps
64px — Page-level spacing
```

### Component Spacing

| Component | Padding | Gap |
|-----------|---------|-----|
| Sidebar item | `8px 12px` | `2px` between items |
| Sidebar section | `16px 12px` | `8px` between sections |
| File tree indent | `16px` per level | — |
| Main panel | `24px 32px` | — |
| Summary card | `24px` | `16px` between elements |
| Settings form | `16px` | `24px` between fields |
| Buttons | `8px 16px` (sm), `12px 24px` (md) | — |

---

## Layout System

### IDE-like Structure

```
┌────────────────────────────────────────────────────────┐
│  Top Bar (48px)  [Logo] [Search ⌘K] [Theme] [Settings] │
├──────────┬─────────────────────────────────────────────┤
│          │                                             │
│ Sidebar  │           Main Panel                        │
│ (280px   │                                             │
│  default,│   ┌─────────────────────────────────┐       │
│  resize- │   │  File: path/to/file.ts          │       │
│  able    │   │  [Bookmark ★] [Regenerate ↻]    │       │
│  200-    │   ├─────────────────────────────────┤       │
│  400px)  │   │                                 │       │
│          │   │  AI Summary (Markdown)           │       │
│ [Tabs]   │   │                                 │       │
│ Tree     │   │  ## Purpose                     │       │
│ Search   │   │  This file handles...           │       │
│ Bookmarks│   │                                 │       │
│ History  │   │  ## Dependencies                │       │
│          │   │  - ServiceA                     │       │
│          │   │  - RepositoryB                  │       │
│          │   │                                 │       │
│          │   └─────────────────────────────────┘       │
│          │                                             │
├──────────┴─────────────────────────────────────────────┤
│  Status Bar (24px)  [Provider: Gemini] [Cache: 142]    │
└────────────────────────────────────────────────────────┘
```

### Key Layout Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sidebar position | Left (fixed) | IDE convention, muscle memory |
| Sidebar width | 280px default, 200-400px resize | VS Code-like, draggable handle |
| Top bar height | 48px | Compact, more space for content |
| Status bar | 24px bottom | Show active LLM provider + cache stats |
| Main panel scroll | Content only, header stays | File path always visible |
| Splitter | Draggable border, 4px handle | Hover highlight with teal color |

---

## Component Design (spartan-ng)

### Sidebar Tabs (`hlm-tabs`)
- **Tabs:** Tree | Search | Bookmarks | History
- **Style:** Bottom border indicator, teal active color
- **Icons:** Lucide icons (consistent outline style)

### File Tree
- **Icons:** File type icons (Lucide: `file-code`, `folder`, `folder-open`)
- **Indent:** 16px per level with vertical guide lines
- **Hover:** Subtle `--sidebar-hover` background
- **Active:** `--primary-tint` background with teal left border (2px)
- **Expand/Collapse:** Chevron rotation animation (160ms ease-out)

### Summary Viewer
- **Markdown:** ngx-markdown with custom theme
- **Code blocks:** JetBrains Mono, dark background even in light mode
- **Syntax highlighting:** highlight.js with atom-one-dark theme
- **Headers:** Clear size hierarchy using our type scale
- **Loading:** Skeleton animation (shimmer, not spinner)

### Settings Page (`hlm-card` + `hlm-select` + `hlm-input`)
- **Layout:** Card-based sections
- **Provider select:** Dropdown with provider logos/icons
- **API Key input:** Password field with show/hide toggle
- **Validate button:** `hlm-button` with loading state
- **Toast:** `hlm-toast` for success/error feedback

### Search (`hlm-command`)
- **Trigger:** `⌘K` / `Ctrl+K`
- **Style:** Modal command palette (like VS Code, Linear)
- **Results:** File path + type badge + last viewed

---

## Motion System

| Category | Duration | Easing | Examples |
|----------|----------|--------|----------|
| Instant | 90-150ms | ease-out | Hover bg, button press, toggle |
| State change | 160-240ms | ease-in-out | Tab switch, sidebar expand, tree toggle |
| Large transition | 240-360ms | ease-out | Panel resize, modal open, theme change |

### Specific Animations
- **File tree expand:** Chevron rotate 90° (160ms ease-out)
- **Theme toggle:** Color transition 200ms ease-in-out
- **Button press:** `scale: 0.98` (90ms)
- **Loading skeleton:** Shimmer gradient sweep (1.5s infinite)
- **Toast enter:** Slide up + fade (240ms ease-out)

### Required
- `prefers-reduced-motion: reduce` support
- No animation > 500ms in product UI

---

## Icons

**Library:** Lucide (outline style, consistent with spartan-ng)

| Context | Icons |
|---------|-------|
| File tree | `folder`, `folder-open`, `file-code`, `file-text`, `file-json` |
| Sidebar tabs | `git-branch-plus` (tree), `search`, `bookmark`, `history` |
| Actions | `refresh-cw` (regenerate), `star` (bookmark), `copy`, `download` |
| Settings | `settings`, `key`, `check-circle`, `alert-circle` |
| LLM Providers | Custom SVG logos for Gemini/OpenAI/Claude/Ollama |
| Theme | `sun`, `moon` |

**Rules:**
- Hit area: 44×44px minimum
- Color: `currentColor` (inherits text color)
- Size: 16px sidebar, 20px toolbar
- Single outline style throughout

---

## Empty & Loading States

### Empty State (No file selected)
- Centered in main panel
- Large icon (48px) + heading + description
- Example: `📄 Select a file` / `Choose a file from the sidebar to see its AI-powered summary`

### Loading State (AI summarizing)
- Skeleton shimmer (4 text blocks + heading)
- Provider badge showing which LLM is processing
- Optional: progress text "Summarizing with Gemini…"

### Error State
- `hlm-card` with `--danger-bg` background
- Error icon + message + retry button
- Show API error details in collapsible

---

## Dark Mode Implementation

```html
<!-- index.html <head> -->
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#0f0f0f" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)">
```

```css
/* On <html> */
:root { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
```

**Dark theme elevation:** Surfaces become *slightly lighter* (not shadows):
- Base: `#0f0f0f`
- Elevated card: `#171717`
- Higher card: `#1f1f1f`
- Borders: `rgba(255, 255, 255, 0.1)`

---

## Anti-AI-Slop Checklist

- [x] **Accent color:** Teal `#0d9488` (NOT indigo/violet)
- [x] **Font choice:** Inter + JetBrains Mono (dev tool standard, intentional)
- [x] **Letter-spacing:** Defined for ALL CAPS, small text, headings
- [x] **Color from research:** Based on Linear/VS Code palette study
- [x] **Layout:** IDE-inspired with visual tension (sidebar + main), not centered template
- [x] **Dark mode:** Separate neutral scale, not inverted
- [x] **Hierarchy:** 3 clear text levels (primary, muted, subtle)
- [x] **Memorable detail:** Command palette `⌘K`, teal accent, skeleton loading

---

## Pre-Ship Quality Gate

| Category | Check |
|----------|-------|
| **Typography** | ≤7 sizes, 2 fonts, 3 weights, letter-spacing on caps/small |
| **Color** | Teal accent, 4.5:1 contrast body, separate dark tokens |
| **Spacing** | 4px grid, consistent rhythm, no random gaps |
| **Motion** | ≤360ms, ease-out enter, `prefers-reduced-motion` |
| **States** | Empty, loading, error, success all designed |
| **Responsive** | Min 320px, sidebar collapsible on mobile |
| **A11y** | WCAG AA contrast, 44px touch targets, focus visible |
