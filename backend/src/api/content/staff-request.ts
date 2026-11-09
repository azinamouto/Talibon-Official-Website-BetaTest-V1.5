import type { Request } from 'express';
import type { StaffPrincipal } from '../../authentication/authentication.adapter';
export { mediaMutation as contentMutation } from '../media/media.controller';
export type StaffRequest = Request & { staff: StaffPrincipal; requestId: string };
