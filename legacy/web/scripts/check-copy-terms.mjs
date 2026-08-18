/* eslint-env node */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(currentFile), "..");
const sourceRoot = path.resolve(packageRoot, "src");
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mdx"]);
const bannedTerms = [
  /hub premium/i,
  /curadoria editorial/i,
  /resumo persistente/i,
  /sem perder o ritmo/i,
  /tickets?\s+digitais?/i,
];

const findings = [];

const walk = (directory) => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath);
      continue;
    }

    if (!allowedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const content = fs.readFileSync(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      bannedTerms.forEach((pattern) => {
        if (pattern.test(line)) {
          findings.push({
            file: absolutePath,
            line: index + 1,
            pattern: pattern.source,
            excerpt: line.trim(),
          });
        }
      });
    });
  }
};

walk(sourceRoot);

if (findings.length > 0) {
  console.error("Copy guardrail falhou: termos proibidos encontrados.\n");
  findings.forEach((finding) => {
    console.error(
      `${finding.file}:${finding.line}\n- termo: /${finding.pattern}/\n- trecho: ${finding.excerpt}\n`,
    );
  });
  globalThis.process.exit(1);
}

console.log("Copy guardrail passou: nenhum termo proibido encontrado.");
