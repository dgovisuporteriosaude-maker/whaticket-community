const fs = require("fs");
const path = require("path");

const customModels = [
  "TicketCategory",
  "ClosingReason",
  "UraFlow",
  "UraOption",
  "AiSetting",
  "KnowledgeBaseArticle"
];

function fixDatabaseIndex() {
  const file = "backend/src/database/index.ts";
  let content = fs.readFileSync(file, "utf8");

  // Remove imports duplicados dos models customizados
  for (const model of customModels) {
    const importRegex = new RegExp(
      `^import\\s+${model}\\s+from\\s+["'][^"']+["'];\\r?\\n`,
      "gm"
    );
    content = content.replace(importRegex, "");
  }

  // Insere imports uma única vez após o último import existente
  const imports = customModels
    .map(model => `import ${model} from "../models/${model}";`)
    .join("\n") + "\n";

  const importMatches = [...content.matchAll(/^import .*;$/gm)];
  if (importMatches.length > 0) {
    const last = importMatches[importMatches.length - 1];
    const insertAt = last.index + last[0].length;
    content = content.slice(0, insertAt) + "\n" + imports + content.slice(insertAt);
  } else {
    content = imports + content;
  }

  // Remove entradas duplicadas dentro do array de models
  for (const model of customModels) {
    const modelLineRegex = new RegExp(`^\\s*${model}\\s*,\\s*\\r?\\n`, "gm");
    content = content.replace(modelLineRegex, "");
  }

  // Insere models customizados no array models: [...]
  const modelLines = customModels.map(model => `    ${model},`).join("\n") + "\n";

  if (/models:\s*\[/.test(content)) {
    content = content.replace(
      /(models:\s*\[[\s\S]*?)(\n\s*\])/m,
      `$1\n${modelLines}$2`
    );
  } else {
    console.warn("AVISO: não encontrei array models: [] em database/index.ts");
  }

  fs.writeFileSync(file, content, "utf8");
  console.log("database/index.ts corrigido.");
}

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      walk(full, callback);
    } else if (full.endsWith(".ts")) {
      callback(full);
    }
  }
}

function fixTextLong() {
  const dirs = [
    "backend/src/models",
    "backend/src/database/migrations"
  ];

  for (const dir of dirs) {
    walk(dir, file => {
      let content = fs.readFileSync(file, "utf8");
      const before = content;

      content = content.replace(/DataTypes\.TEXT\("long"\)/g, "DataTypes.TEXT");
      content = content.replace(/DataType\.TEXT\("long"\)/g, "DataType.TEXT");

      if (content !== before) {
        fs.writeFileSync(file, content, "utf8");
        console.log("Corrigido:", file);
      }
    });
  }
}

fixDatabaseIndex();
fixTextLong();

console.log("Correções aplicadas com sucesso.");
