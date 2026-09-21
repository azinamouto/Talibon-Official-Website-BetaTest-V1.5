import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../../supabase.service';
import { UserListDto } from './users.dto';

const FIELDS = 'id,email,full_name,role,is_verified,barangay_id,department_id,created_at,updated_at,deleted_at,version';
@Injectable()
export class UsersService {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}
  private check(error: { code?: string } | null) {
    if (!error) return;
    if (error.code === '42501') throw new ForbiddenException('This user operation is not permitted.');
    if (error.code === 'P0002') throw new NotFoundException('User not found.');
    if (error.code === '40001') throw new ConflictException('User changed; reload before retrying.');
    if (['23503','23514','22023'].includes(error.code)) throw new BadRequestException('Invalid user details or role.');
    throw new ServiceUnavailableException('User storage is unavailable.');
  }
  async list(query: UserListDto) {
    let request = this.supabase.getClient().from('profiles').select(FIELDS, { count: 'exact' });
    if (query.role) request = request.eq('role', query.role);
    if (query.status === 'active') request = request.is('deleted_at', null);
    if (query.status === 'inactive') request = request.not('deleted_at', 'is', null);
    const { data, count, error } = await request.order('created_at', { ascending: false }).order('id', { ascending: false })
      .range((query.page-1)*query.limit,query.page*query.limit-1);
    this.check(error);
    return { data: data ?? [], pagination: { page: query.page, limit: query.limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0)/query.limit) } };
  }
  async get(id: string) {
    const { data, error } = await this.supabase.getClient().from('profiles').select(FIELDS).eq('id',id).maybeSingle();
    this.check(error);
    if (!data) throw new NotFoundException('User not found.');
    return { data };
  }
  async mutate(actorId: string, id: string, action: 'update' | 'role' | 'deactivate', version: number, patch: object, requestId: string) {
    const fields = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    if (action === 'update' && !Object.keys(fields).length) throw new BadRequestException('Provide at least one field to update.');
    const { data, error } = await this.supabase.getClient().rpc('admin_mutate_user', {
      p_actor: actorId, p_target: id, p_action: action, p_version: version, p_patch: fields, p_request_id: requestId,
    });
    this.check(error);
    return { data };
  }
}
