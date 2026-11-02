# Workflow: Photos, documents, object storage
**When:** Uploads, CMS, public media serving, Neon Object Storage integration.

1. Verify Neon Object Storage availability, S3-compatible contract, limits, presigning/credentials and bucket/permission behavior from current provider docs.
2. Separate draft/private objects from published/public assets. Upload through authenticated, authorized server-controlled flow or safely constrained signed upload.
3. Validate extension, MIME, file signature, maximum size, document type and filename server-side. Prefer generated keys and optional malware scan policy; never trust browser-only validation.
4. Persist object key, checksum, MIME, byte size, category, title, publication state, uploader and timestamps in Neon PostgreSQL.
5. Require publish/unpublish authorization and audit events. No public download of unpublished objects; handle expiring URLs, missing object and deletion recovery.
6. During migration, inventory Supabase Storage paths; copy with checksum reconciliation and verify public references and private ACL before cutover.
7. Test upload, overwrite prevention, failed write rollback/compensation, access boundaries, download and deletion.
**Done:** no missing/broken files, least-privileged storage, verified data/object reconciliation.
