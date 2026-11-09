// Stable catalog evidence, excluding OIDs and deployment-specific owner names.
// Exact comparison deliberately fails closed on drift or server deparser changes.
async function catalog(c) {
  const queries = {
    relations: `SELECT n.nspname,c.relname,c.relkind,c.relowner=current_user::regrole AS owned,c.relrowsecurity,c.relforcerowsecurity,c.reloptions,
      CASE WHEN c.relkind='v' THEN pg_get_viewdef(c.oid,true) END AS definition
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='app' OR (n.nspname='public' AND c.relname LIKE 'r2_auth_%') ORDER BY 1,2`,
    columns: `SELECT table_schema,table_name,column_name,ordinal_position,column_default,is_nullable,data_type
      FROM information_schema.columns WHERE table_schema='app' OR (table_schema='public' AND table_name LIKE 'r2_auth_%') ORDER BY 1,2,4`,
    constraints: `SELECT n.nspname,c.relname,x.conname,x.convalidated,pg_get_constraintdef(x.oid,true) AS definition
      FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='app' OR (n.nspname='public' AND c.relname LIKE 'r2_auth_%') ORDER BY 1,2,3`,
    triggers: `SELECT n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true) AS definition
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE NOT t.tgisinternal AND (n.nspname='app' OR (n.nspname='public' AND c.relname LIKE 'r2_auth_%')) ORDER BY 1,2,3`,
    indexes: `SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
      WHERE schemaname='app' OR (schemaname='public' AND tablename LIKE 'r2_auth_%') ORDER BY 1,2,3`,
    functions: `SELECT p.proname,p.proowner=current_user::regrole AS owned,pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' ORDER BY 1`,
    grants: `SELECT table_schema,table_name,column_name,grantee,privilege_type,is_grantable
      FROM information_schema.column_privileges WHERE (table_schema='app' OR (table_schema='public' AND table_name LIKE 'r2_auth_%'))
      AND grantee<>current_user ORDER BY 1,2,3,4,5`,
    functionGrants: `SELECT p.proname,a.grantee::regrole::text AS grantee,a.privilege_type,a.is_grantable
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
      LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
      WHERE n.nspname='app' AND a.grantee<>p.proowner ORDER BY 1,2,3`,
    tableGrants: `SELECT n.nspname,c.relname,a.grantee::regrole::text AS grantee,a.privilege_type,a.is_grantable
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
      LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
      WHERE (n.nspname='app' OR (n.nspname='public' AND c.relname LIKE 'r2_auth_%'))
      AND c.relkind IN ('r','v') AND a.grantee<>c.relowner ORDER BY 1,2,3,4`
  };
  const result = {};
  for (const [key,sql] of Object.entries(queries)) result[key] = (await c.query(sql)).rows;
  return result;
}
module.exports = { catalog };
