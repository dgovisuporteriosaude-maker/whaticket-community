const fs = require("fs");

const path = "backend/src/providers/WhatsApp/Implementations/wwebjs.ts";
let content = fs.readFileSync(path, "utf8");

// Remove qualquer linha que comece com "session:"
content = content.replace(/^\s*session\s*:\s*[^,\n]+,\s*\r?\n/gm, "");

// Também remove se estiver como session: algumaCoisa sem vírgula
content = content.replace(/^\s*session\s*:\s*.*\r?\n/gm, "");

fs.writeFileSync(path, content, "utf8");

console.log("Linhas com session restantes:");
console.log(
  content
    .split(/\r?\n/)
    .map((line, index) => ({ line, number: index + 1 }))
    .filter((item) => item.line.includes("session:"))
);
