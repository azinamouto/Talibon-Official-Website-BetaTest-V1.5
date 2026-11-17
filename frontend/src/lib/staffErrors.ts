export const fieldMessages: Record<string,string> = {
  required:'Complete this field.', uuid:'Choose a valid record from the list.', length:'This field exceeds its allowed length.',
  invalid:'Check this field.', unsupported:'Remove unsupported fields.',
  filename:'Use a filename starting with a letter or number, with letters, numbers, spaces, hyphens or underscores (up to 101 characters before the extension).',
  file_type:'Choose a JPEG, PNG, WebP or PDF whose extension matches its file type.', file_size:'Choose a non-empty file up to 2 MiB.',
  file_content:'This file could not be verified. Use a static image or a passive PDF without forms, scripts or external actions.',
  base64:'The file could not be read correctly. Choose it again and retry.', category_kind:'Choose a category matching this file: photos for images, documents for PDFs.',
  category_missing:'This category is unavailable. Refresh the choices and choose another.', source_missing:'This source is unavailable. Refresh the choices and choose another.',
  source_unapproved:'An administrator must review and approve this source before publication.', category_unapproved:'This category must be approved before publication.',
  photo_alt:'Describe this photo with alternative text.', attachment_missing:'An attached file is unavailable or not ready. Remove it or retry its upload.',
  attachment_private:'Publish each attached file separately before publishing this record. Source and category approval are required.',
  featured_photo:'Choose a ready photo as the featured image.', gallery_photo:'Photo collections can contain only photos.',
  document_required:'Attach a published PDF before publishing this record.', gallery_required:'Attach at least one published photo before publishing this collection.',
  date:'Enter a valid calendar date.', slug:'Use lowercase letters, numbers and single hyphens.', chart:'Complete each official’s name and role.', body:'Check the content fields.',
};
const fallback: Record<number,string> = {400:'Check the content fields, approved source and published attachments.',
  401:'Sign in and complete MFA to continue.',403:'This action requires authorized staff access and, for sensitive operations, a current administrator authenticator code.',
  404:'This record or file is no longer available. Refresh and try again.',409:'This record changed or requires unpublishing before editing. Refresh it before retrying.',
  413:'The upload is too large. Choose a file up to 2 MiB.',429:'Too many requests. Wait a moment before retrying.',503:'The operation could not be confirmed. Refresh records before retrying.'};
export class StaffRequestError extends Error {
  constructor(public readonly status: number, public readonly fields: Record<string,string> = {}) {
    super(Object.keys(fields).length ? 'Check the highlighted fields.' : fallback[status] || 'Request could not be completed. Please try again.');
  }
}
export function staffResponseError(status: number, value: unknown): StaffRequestError {
  const fields: Record<string,string> = {};
  const codes = value && typeof value === 'object' && 'fieldErrors' in value ? value.fieldErrors : null;
  if (status === 400 && codes && typeof codes === 'object' && !Array.isArray(codes)) {
    for (const [field,code] of Object.entries(codes).slice(0,50)) {
      if (/^(title|description|altText|categoryId|sourceId|uploadId|filename|mime|base64|file|slug|version|body|summary|content|category|date|deadline|year|featuredAssetId|attachments|mayor|level2|departments|reference|owner|sha256|author|location|address|contact|opening_hours|venue|time|budget|status|head|q|kind|page|request)$/.test(field)
        || /^(highlights|media|start_time|end_time|nodes|officials|email)$/.test(field) || /^highlights\.[0-9]{1,2}$/.test(field)
        || /^(nodes|officials)\.[0-9]{1,2}(\.(id|name|role|office|reportsTo|photoAssetId))?$/.test(field)
        || /^attachments\.[0-9]{1,2}\.(altText|caption|assetId)$/.test(field)
        || /^(mayor\.(name|role)|(level2|departments)\.[0-9]{1,2}\.(name|role))$/.test(field)) {
        if (typeof code === 'string' && Object.hasOwn(fieldMessages,code)) fields[field] = fieldMessages[code];
      }
    }
  }
  return new StaffRequestError(status,fields);
}
export function errorFields(reason: unknown): Record<string,string> {
  return reason instanceof StaffRequestError ? reason.fields : {};
}
