const fs = require("fs");

const path = "backend/src/providers/WhatsApp/Implementations/wwebjs.ts";
let content = fs.readFileSync(path, "utf8");

// Remove variável antiga que não é mais necessária com LocalAuth
content = content.replace(
  /^\s*const sessionCfg = whatsapp\?\.session \? JSON\.parse\(whatsapp\.session\) : \{\};\s*\r?\n/gm,
  ""
);

// Força o objeto do new Client como any para evitar erro de typings antigos/incompatíveis
content = content.replace(
  /const wbot: Session = new Client\(\{/,
  "const wbot: Session = new Client({"
);

content = content.replace(
  /(\s+puppeteer:\s*\{[\s\S]*?\n\s+\}\n\s+\}\);)/,
  (match) => match.replace(/\}\);$/, "} as any);")
);

fs.writeFileSync(path, content, "utf8");

console.log("Ajuste aplicado. Trecho do new Client:");
const lines = content.split(/\r?\n/);
const start = lines.findIndex(line => line.includes("const wbot: Session = new Client"));
console.log(lines.slice(start, start + 28).join("\n"));
