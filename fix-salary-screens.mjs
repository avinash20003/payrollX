// Run from the project root:  node fix-salary-screens.mjs
import fs from "node:fs";

const file = "components/salary/monthly-salary.tsx";
let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
fs.writeFileSync(file + ".bak", s);

const cut = (label, regex, replacement = "") => {
  const next = s.replace(regex, replacement);
  if (next === s) console.warn("  not found:", label);
  s = next;
};

// 1. Remove the screen's own theme system (the shell owns the theme now)
cut("lightModeCss", /const lightModeCss = `[\s\S]*?`;\n\n?/);
cut("useSalaryTheme + ThemeButton", /function useSalaryTheme\(\) \{[\s\S]*?\n\}\n\nfunction ThemeButton\([\s\S]*?\n\}\n\n/);
cut("theme hook calls", /[ \t]*const \{ theme, toggleTheme \} = useSalaryTheme\(\);\n\n?/g);
cut("style tags", /[ \t]*<style>\{lightModeCss\}<\/style>\n\n?/g);
cut("ThemeButton usage", /[ \t]*<ThemeButton theme=\{theme\} toggleTheme=\{toggleTheme\} \/>\n\n?/g);
cut("Moon/Sun imports", /^[ \t]*(Moon|Sun),\n/gm);

// 2. Nested <main> with p-1 and its own background -> plain wrapper
cut("main wrapper", /<main\s+className=\{`salary-screen[\s\S]*?`\}\s*>/g, '<div className="min-h-full space-y-6 text-[var(--shell-text)]">');
s = s.replaceAll("</main>", "</div>");

// 3. Hard-coded colours -> shell theme variables
const map = [
  ["bg-[#0d1526]", "bg-[var(--shell-surface)]"],
  ["bg-[#0a1120]", "bg-[var(--shell-bg)]"],
  ["bg-[#111c33]", "bg-[var(--shell-hover)]"],
  ["hover:bg-[#17233b]", "hover:bg-[var(--shell-hover)]"],
  ["border-[#1f2d4a]", "border-[var(--shell-border)]"],
  ["divide-[#1f2d4a]", "divide-[var(--shell-border)]"],
  ["text-slate-100", "text-[var(--shell-text)]"],
  ["text-slate-400", "text-[var(--shell-muted)]"],
  ["text-blue-300", "text-[var(--shell-accent)]"],
  ["text-blue-200", "text-[var(--shell-accent)]"],
  ["text-red-200", "text-[var(--shell-danger)]"],
  ["text-red-300", "text-[var(--shell-danger)]"],
  ["text-rose-300", "text-[var(--shell-danger)]"],
  ["text-emerald-200", "text-[var(--shell-success)]"],
  ["text-emerald-300", "text-[var(--shell-success)]"],
];
for (const [from, to] of map) s = s.replaceAll(from, to);

fs.writeFileSync(file, s);

const left = s.match(/#0d1526|#0a1120|#111c33|#1f2d4a|#17233b|#09111f|useSalaryTheme|ThemeButton|lightModeCss|<main/g);
console.log(left ? "Left over: " + [...new Set(left)].join(", ") : "Done. Backup saved as " + file + ".bak");