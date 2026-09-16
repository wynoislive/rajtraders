import type { Request } from "express";

export interface AuditLogPayload {
  action: string;
  resource: string;
  resourceId?: string | null;
  status: "SUCCESS" | "FAILURE" | "DENIED";
  details?: Record<string, unknown>;
}

export interface FormattedAuditEvent {
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  clientIp: string;
  userAgent: string;
  action: string;
  resource: string;
  resourceId: string | null;
  status: "SUCCESS" | "FAILURE" | "DENIED";
  details: Record<string, unknown>;
}

/**
 * Emits an immutable, structured security audit event.
 * Formatted for direct SIEM ingestion (e.g. Datadog, AWS CloudWatch, Grafana Loki).
 */
export function logAuditEvent(req: Request, payload: AuditLogPayload): FormattedAuditEvent {
  const staff = req.staff;
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown";

  const event: FormattedAuditEvent = {
    timestamp: new Date().toISOString(),
    actorId: staff?.userId || "anonymous",
    actorEmail: staff?.email || "anonymous",
    actorRole: staff?.role || "GUEST",
    clientIp: ip,
    userAgent: req.headers["user-agent"] || "unknown",
    action: payload.action,
    resource: payload.resource,
    resourceId: payload.resourceId ?? null,
    status: payload.status,
    details: payload.details ?? {},
  };

  req.log?.info?.(
    { audit: event },
    `SECURITY_AUDIT: [${event.action}] on [${event.resource}${event.resourceId ? `:${event.resourceId}` : ""}] by [${event.actorEmail}] - ${event.status}`
  );

  return event;
}
