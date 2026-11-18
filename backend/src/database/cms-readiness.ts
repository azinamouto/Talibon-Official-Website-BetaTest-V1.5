import { DatabaseError, type SqlSession } from './postgres';
import { attachFailure } from '../security/failure-diagnostics';

function unavailable(reason: 'cms_schema_missing' | 'cms_permission_missing' | 'media_category_missing'): never {
  throw attachFailure(new DatabaseError('unavailable'), { phase:'configuration',reason });
}

/** Read-only capability checks for the deployed CMS. A reachable foundation
 * database is insufficient for uploads and direct publication after 003/004. */
export async function assertContentPublishingReady(tx: SqlSession): Promise<void> {
  const [row] = await tx.query(`WITH required AS (
    SELECT to_regprocedure(signature) AS id FROM unnest(ARRAY[
      'app.publish_staff_content(uuid,text,text,uuid,integer,text)',
      'app.publish_staff_media(uuid,text,text,uuid,integer,text,text)',
      'app.publish_staff_media_bundle(uuid,text,text,jsonb,text)',
      'app.approve_content_source(uuid,text,text,uuid,text)'
    ]) AS signature
  ) SELECT
    (SELECT bool_and(id IS NOT NULL) FROM required)
      AND to_regclass('app.content_publication_receipts') IS NOT NULL
      AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='app'
        AND table_name='public_content' AND column_name='source_id' AND is_nullable='YES')
      AND (SELECT count(*)=4 FROM information_schema.columns WHERE table_schema='app'
        AND table_name='public_content' AND column_name IN ('created_at','created_by','updated_by','published_by')) AS schema_ready,
    COALESCE((SELECT bool_and(has_function_privilege(current_user,id,'EXECUTE')) FROM required),false)
      AND CASE WHEN to_regclass('app.content_publication_receipts') IS NULL THEN false ELSE
        has_table_privilege(current_user,'app.content_publication_receipts','SELECT')
        AND has_table_privilege(current_user,'app.content_publication_receipts','INSERT') END
      AND has_table_privilege(current_user,'app.content_asset_links','SELECT')
      AND has_table_privilege(current_user,'app.content_asset_links','INSERT')
      AND has_table_privilege(current_user,'app.content_asset_links','DELETE') AS permissions_ready`);
  if (row?.schema_ready !== true) unavailable('cms_schema_missing');
  if (row.permissions_ready !== true) unavailable('cms_permission_missing');
}

export async function assertMediaUploadsReady(tx: SqlSession): Promise<void> {
  const [row] = await tx.query(`SELECT
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='app'
      AND table_name='media_assets' AND column_name='source_id' AND is_nullable='YES')
      AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='app'
        AND table_name='media_assets' AND column_name='published_by') AS schema_ready,
    (SELECT count(*)=2 FROM app.media_categories WHERE approved AND
      ((kind='photo' AND slug='website-photos') OR (kind='document' AND slug='website-documents'))) AS categories_ready`);
  if (row?.schema_ready !== true) unavailable('cms_schema_missing');
  if (row.categories_ready !== true) unavailable('media_category_missing');
}
