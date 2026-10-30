// Run from the project root:  node fix-theme-pages.mjs
import fs from "node:fs";

const pages = [
  { file: "app/(app)/dashboard/page.tsx", kind: "dashboard" },
  { file: "app/(app)/employees/page.tsx", kind: "page" },
  { file: "app/admin/users/page.tsx", kind: "page" },
  { file: "app/admin/users/list/page.tsx", kind: "page" },
];

const S = "var(--shell-surface)", H = "var(--shell-hover)", B = "var(--shell-border)";
const T = "var(--shell-text)", M = "var(--shell-muted)", F = "var(--shell-field)";
const map = [
  ["hover:bg-blue-500/[0.025]", `hover:bg-[${H}]`],
  ["hover:bg-slate-800/30", `hover:bg-[${H}]`],
  ["hover:bg-slate-800", `hover:bg-[${H}]`],
  ["bg-[#0d1422]/95", `bg-[${S}]`],
  ["bg-[#0d1422]", `bg-[${S}]`],
  ["bg-[#101827]", `bg-[${S}]`],
  ["bg-[#0d1524]", `bg-[${S}]`],
  ["bg-[#0b1220]", `bg-[${F}]`],
  ["bg-slate-900/80", `bg-[${F}]`],
  ["bg-[#0a111e]/70", `bg-[${H}]`],
  ["bg-slate-900/60", `bg-[${H}]`],
  ["bg-slate-900/30", `bg-[${H}]`],
  ["bg-slate-800/70", `bg-[${H}]`],
  ["bg-slate-800/60", `bg-[${H}]`],
  ["bg-slate-800/50", `bg-[${H}]`],
  ["bg-slate-900", `bg-[${S}]`],
  ["border-slate-700/80", `border-[${B}]`],
  ["border-slate-700", `border-[${B}]`],
  ["border-slate-800/80", `border-[${B}]`],
  ["border-slate-800", `border-[${B}]`],
  ["divide-slate-800/80", `divide-[${B}]`],
  ["divide-slate-800", `divide-[${B}]`],
  ["text-emerald-300/70", "text-[var(--shell-success)] opacity-70"],
  ["text-red-300/70", "text-[var(--shell-danger)] opacity-70"],
  ["hover:text-emerald-200", "hover:opacity-100"],
  ["hover:text-red-200", "hover:opacity-100"],
  ["text-slate-100", `text-[${T}]`],
  ["text-slate-200", `text-[${T}]`],
  ["text-slate-300", `text-[${T}]`],
  ["text-white", `text-[${T}]`],
  ["text-slate-400", `text-[${M}]`],
  ["text-slate-500", `text-[${M}]`],
  ["text-slate-600", `text-[${M}]`],
  ["text-blue-200", "text-[var(--shell-accent)]"],
  ["text-blue-300", "text-[var(--shell-accent)]"],
  ["text-blue-400", "text-[var(--shell-accent)]"],
  ["text-sky-300", "text-[var(--shell-accent)]"],
  ["text-emerald-300", "text-[var(--shell-success)]"],
  ["text-emerald-400", "text-[var(--shell-success)]"],
  ["text-red-300", "text-[var(--shell-danger)]"],
  ["text-red-400", "text-[var(--shell-danger)]"],
  ["text-amber-300", "text-[var(--shell-warn)]"],
  ["text-amber-400", "text-[var(--shell-warn)]"],
  ["text-violet-300", "text-[var(--shell-violet)]"],
  ["text-violet-400", "text-[var(--shell-violet)]"],
  ["[color-scheme:dark]", ""],
];

function recolor(lit) {
  if (lit.includes("bg-blue-600")) {
    return lit.includes("text-white") ? lit : lit[0] + "text-white " + lit.slice(1);
  }
  let out = lit;
  for (const [from, to] of map) out = out.split(from).join(to);
  return out;
}

const wrappers = [
  ['<div className="min-h-screen bg-[#080e1b] px-4 py-6 text-white sm:px-6 lg:px-8">', '<div className="min-h-full text-[var(--shell-text)]">'],
  ['<div className="relative min-h-full bg-[#080e1a] px-4 py-8 text-slate-100 sm:px-8 sm:py-10">', '<div className="relative min-h-full text-[var(--shell-text)]">'],
];

for (const { file, kind } of pages) {
  if (!fs.existsSync(file)) {
    console.warn(`skipped (file not found): ${file}`);
    continue;
  }
  if (fs.existsSync(file + ".bak")) {
    console.warn(`skipped (already converted, ${file}.bak exists): ${file}`);
    continue;
  }

  let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  fs.writeFileSync(file + ".bak", s);
  const warn = (what) => console.warn(`  ${file}: not found -> ${what}`);
  const cut = (what, regex, to = "") => {
    const next = s.replace(regex, to);
    if (next === s) warn(what);
    s = next;
  };

  if (kind === "dashboard") {
    cut("Theme type", /type Theme = "light" \| "dark";\n\n/);
    cut("theme state", /  const \[theme, setTheme\] = useState<Theme>\("dark"\);\n/);
    cut("theme effect + toggle", /  \/\/ Same key as the salary pages[\s\S]*?\n  function toggleTheme\(\) \{[\s\S]*?\n  \}\n\n/);
    cut("toggle button", /[ \t]*<button type="button" onClick=\{toggleTheme\}[\s\S]*?<\/button>\n/);
    cut("Moon import", /^[ \t]*Moon,\n/m);
    cut("Sun import", /^[ \t]*Sun,\n/m);
    cut("root", /<main data-theme=\{theme\} className="salary-theme min-h-screen">/, '<div className="salary-theme">');
    s = s.replace("    </main>\n  );\n}\n\n/* ------------------------------ small components", "    </div>\n  );\n}\n\n/* ------------------------------ small components");
    cut("page padding", 'className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 xl:p-8"', 'className="mx-auto max-w-[1600px] space-y-6"');
    cut("light vars", /\.salary-theme\[data-theme="light"\] \{/, '[data-shell-theme="light"] .salary-theme {');
    cut("dark vars", /\.salary-theme\[data-theme="dark"\] \{/, '[data-shell-theme="dark"] .salary-theme {');
    cut("own background", /\n          background: var\(--bg\);/);
    cut("own colour scheme", /\n          color-scheme: light;/);
    cut("dark colour scheme", /\n          color-scheme: dark;/);
  } else {
    let wrapped = false;
    for (const [from, to] of wrappers) {
      if (s.includes(from)) { s = s.replace(from, to); wrapped = true; }
    }
    if (!wrapped) warn("page wrapper");
    s = s.replace(/"[^"\n]*"|`[^`]*`/g, recolor);
  }

  fs.writeFileSync(file, s);

  const left = s.match(/bg-\[#[0-9a-f]{6}\]|bg-slate-\d+|border-slate-\d+|text-slate-\d+|data-theme=\{theme\}|min-h-screen/g);
  console.log(`${file}: ${left ? "left over -> " + [...new Set(left)].join(", ") : "ok"}`);
}
console.log("Backups saved as <file>.bak");