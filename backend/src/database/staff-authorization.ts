import { DatabaseError, SqlSession } from './postgres';
import { StaffPrincipal } from '../authentication/authentication.adapter';

export async function authorizeStaff(tx: SqlSession, actor: StaffPrincipal, fresh = false) {
    if (!actor?.sessionVerified || actor.assurance !== 'mfa') throw new DatabaseError('forbidden');
    const rows = await tx.query(`SELECT a.id FROM app.staff_accounts a
      JOIN public.r2_auth_user u ON u.id=a.subject JOIN public.r2_auth_session s ON s."userId"=u.id
      JOIN app.staff_session_assurance m ON m.session_id=s.id
      WHERE a.id=$1 AND a.provider='better-auth' AND a.subject=$2 AND a.active
      AND a.role IN ('admin','editor') AND u."emailVerified" AND u."twoFactorEnabled"
      AND s.id=$3 AND s."expiresAt">now() AND m.verified_at>now()-($4::int * interval '1 second')
      AND (NOT $5::boolean OR a.role='admin') FOR SHARE OF a,s,m`,
    [actor.id, actor.subject, actor.sessionId, fresh ? 300 : 28800, fresh]);
    if (!rows.length) throw new DatabaseError('forbidden');
}
