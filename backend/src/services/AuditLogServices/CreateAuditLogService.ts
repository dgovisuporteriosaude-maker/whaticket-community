import { Request } from "express";

import AuditLog from "../../models/AuditLog";
import User from "../../models/User";
import { logger } from "../../utils/logger";

interface AuditRequest {
  req: Request;
  action: string;
  resource: string;
  resourceId?: string | number | null;
  beforeData?: any;
  afterData?: any;
}

const safeJson = (value: any): string | null => {
  if (value === null || value === undefined) return null;

  try {
    return JSON.stringify(value).slice(0, 65000);
  } catch (err) {
    return "[unserializable]";
  }
};

const CreateAuditLogService = async ({
  req,
  action,
  resource,
  resourceId,
  beforeData,
  afterData
}: AuditRequest): Promise<void> => {
  try {
    const user = req.user?.id ? await User.findByPk(req.user.id) : null;

    await AuditLog.create({
      userId: req.user?.id,
      userName: user?.name || null,
      userProfile: req.user?.profile || null,
      action,
      resource,
      resourceId: resourceId === null || resourceId === undefined ? null : String(resourceId),
      method: req.method,
      route: req.originalUrl,
      ip: req.ip,
      beforeData: safeJson(beforeData),
      afterData: safeJson(afterData)
    });
  } catch (err) {
    logger.warn(`Audit log failed: ${err}`);
  }
};

export default CreateAuditLogService;
