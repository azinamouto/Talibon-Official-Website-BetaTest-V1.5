import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

// Only these machine codes and field names may cross the API boundary. Never
// include input values, SQL/provider messages, object keys or parser diagnostics.
export const CMS_ERROR_CODES = ['required','uuid','length','invalid','unsupported','filename','file_type','file_size',
  'file_content','base64','category_kind','category_missing','source_missing','source_unapproved','category_unapproved',
  'photo_alt','attachment_missing','attachment_private','featured_photo','gallery_photo','document_required',
  'gallery_required','date','slug','chart','body'] as const;
export type CmsErrorCode = typeof CMS_ERROR_CODES[number];
export type CmsFieldErrors = Record<string, CmsErrorCode>;
export const CMS_VALIDATION_SCHEMA = { type: 'object' as const, properties: {
  message: { type: 'string' as const }, statusCode: { type: 'integer' as const, example: 400 }, requestId: { type: 'string' as const },
  fieldErrors: { type: 'object' as const, maxProperties: 50, description: 'Bounded field paths mapped to safe validation codes; input values and provider diagnostics are never included.', additionalProperties: { type: 'string' as const, enum: [...CMS_ERROR_CODES] } },
} };
export function safeFieldErrors(value: unknown): CmsFieldErrors {
  const result: CmsFieldErrors = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [field, code] of Object.entries(value).slice(0, 50)) {
    if (/^(title|description|altText|categoryId|sourceId|uploadId|filename|mime|base64|file|slug|version|body|summary|content|category|date|deadline|year|featuredAssetId|attachments|mayor|level2|departments|reference|owner|sha256|author|location|address|contact|opening_hours|venue|time|budget|status|head|q|kind|page|request)$/.test(field)
      || /^(highlights|attachments|media|start_time|end_time)$/.test(field) || /^highlights\.[0-9]{1,2}$/.test(field)
      || /^attachments\.[0-9]{1,2}\.(altText|caption|assetId)$/.test(field)
      || /^(mayor\.(name|role)|(level2|departments)\.[0-9]{1,2}\.(name|role))$/.test(field)) {
      if ((CMS_ERROR_CODES as readonly unknown[]).includes(code)) result[field] = code as CmsErrorCode;
    }
  }
  return result;
}
export class CmsInputError extends BadRequestException {
  readonly fields: CmsFieldErrors;
  constructor(fields: CmsFieldErrors, message = 'Check the highlighted fields.') {
    const safe = safeFieldErrors(fields);
    super({ message, fieldErrors: safe });
    this.fields = safe;
  }
}
export function invalidField(field: string, code: CmsErrorCode): never { throw new CmsInputError({ [field]: code }); }
export function dtoValidationException(errors: ValidationError[]) {
  const fields: CmsFieldErrors = {};
  for (const error of errors) {
    const rules = Object.keys(error.constraints ?? {});
    const code: CmsErrorCode = rules.includes('whitelistValidation') ? 'unsupported' : rules.includes('isUuid') ? 'uuid'
      : error.property === 'base64' && rules.includes('maxLength') ? 'file_size' : error.property === 'mime' ? 'file_type'
      : rules.some(rule => ['maxLength','minLength','length'].includes(rule)) ? 'length'
      : rules.some(rule => ['isString','isNotEmpty','isDefined','matches'].includes(rule)) ? 'required' : 'invalid';
    const field = Object.keys(safeFieldErrors({ [error.property]: code }))[0] ?? 'request';
    fields[field] = code;
  }
  return new CmsInputError(fields);
}
