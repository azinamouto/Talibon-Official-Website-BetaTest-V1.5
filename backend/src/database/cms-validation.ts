import { DatabaseError } from './postgres';
import { CmsFieldErrors, safeFieldErrors } from '../security/cms-validation';

/** Survives transaction rollback/sanitization without exposing a database cause. */
export class CmsValidationError extends DatabaseError {
  readonly fields: CmsFieldErrors;
  constructor(fields: CmsFieldErrors) { super('invalid'); this.fields = safeFieldErrors(fields); }
}
