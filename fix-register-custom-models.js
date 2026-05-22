const fs = require("fs");

const file = "backend/src/database/index.ts";

const customModels = [
  "TicketCategory",
  "ClosingReason",
  "UraFlow",
  "UraOption",
  "AiSetting",
  "KnowledgeBaseArticle"
];

let content = fs.readFileSync(file, "utf8");

// Remove imports duplicados antigos
for (const model of customModels) {
  const re = new RegExp(`^import\\s+${model}\\s+from\\s+["'][^"']+["'];\\r?\\n`, "gm");
  content = content.replace(re, "");
}

// Adiciona imports uma vez, depois do último import
const imports = customModels
  .map(model => `import ${model} from "../models/${model}";`)
  .join("\n") + "\n";

const importMatches = [...content.matchAll(/^import .*;$/gm)];

if (importMatches.length > 0) {
  const last = importMatches[importMatches.length - 1];
  const pos = last.index + last[0].length;
  content = content.slice(0, pos) + "\n" + imports + content.slice(pos);
} else {
  content = imports + content;
}

// Remove entradas duplicadas no array de models
for (const model of customModels) {
  const re = new RegExp(`^\\s*${model}\\s*,\\s*\\r?\\n`, "gm");
  content = content.replace(re, "");
}

// Insere os models customizados dentro do array models: [...]
const modelLines = customModels.map(model => `    ${model},`).join("\n") + "\n";

if (/models:\s*\[/.test(content)) {
  content = content.replace(
    /(models:\s*\[[\s\S]*?)(\n\s*\])/m,
    `$1\n${modelLines}$2`
  );
} else {
  console.error("Nao encontrei o array models: [] em backend/src/database/index.ts");
  process.exit(1);
}

fs.writeFileSync(file, content, "utf8");

console.log("database/index.ts ajustado com models customizados.");
