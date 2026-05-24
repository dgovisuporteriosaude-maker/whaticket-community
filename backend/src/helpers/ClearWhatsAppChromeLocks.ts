import { existsSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { logger } from "../utils/logger";

const chromeLockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie"];

const clearNestedLocks = (dir: string): void => {
  if (!existsSync(dir)) return;

  readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const entryPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      clearNestedLocks(entryPath);
      return;
    }

    if (entry.name === "LOCK" || chromeLockFiles.includes(entry.name)) {
      rmSync(entryPath, { force: true });
    }
  });
};

const ClearWhatsAppChromeLocks = (whatsappId: number): void => {
  const sessionPath = join(process.cwd(), ".wwebjs_auth", `session-bd_${whatsappId}`);

  try {
    chromeLockFiles.forEach(file => {
      const lockPath = join(sessionPath, file);
      if (existsSync(lockPath)) {
        rmSync(lockPath, { force: true, recursive: true });
      }
    });
    clearNestedLocks(sessionPath);
  } catch (err) {
    logger.warn({ err, whatsappId, sessionPath }, "Could not clear whatsapp chrome locks");
  }
};

export default ClearWhatsAppChromeLocks;
