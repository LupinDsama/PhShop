/**
 * Audit log: ghi lại mọi thao tác nhạy cảm (quyền, đơn hàng, sản phẩm, đăng nhập).
 */
import { run } from '../db/index.js'

export function audit({
  actorUserId = null,
  actorEmail = '',
  actorRole = 'SYSTEM',
  action,
  entityType = '',
  entityId = '',
  before = null,
  after = null,
  ip = '',
  userAgent = '',
}) {
  run(
    `INSERT INTO audit_log (actor_user_id, actor_email, actor_role, action, entity_type, entity_id, before_json, after_json, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actorUserId,
      String(actorEmail || '').slice(0, 320),
      actorRole,
      action,
      entityType,
      String(entityId || ''),
      before === null || before === undefined ? null : JSON.stringify(before),
      after === null || after === undefined ? null : JSON.stringify(after),
      String(ip || '').slice(0, 64),
      String(userAgent || '').slice(0, 255),
    ],
  )
}

export default audit
