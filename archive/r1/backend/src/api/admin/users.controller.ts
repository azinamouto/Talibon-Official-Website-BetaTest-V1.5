import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiCreatedResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Permissions } from '../../security/permissions';
import { AuthenticatedRequest } from '../../security/authenticated-request';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import { AdminUserListResponseDto, AdminUserResponseDto, AssignRoleDto, UpdateUserDto, UserListDto, UserVersionDto } from './users.dto';
import { UsersService } from './users.service';

@ApiTags('Admin users') @ApiBearerAuth() @Permissions('users:read')
@ApiUnauthorizedResponse({ description: 'Missing, expired or revoked session' })
@ApiForbiddenResponse({ description: 'Insufficient permission, self-mutation, or protected administrative target' })
@ApiBadRequestResponse({ description: 'Invalid fields, version, role or referenced department/barangay' })
@ApiNotFoundResponse({ description: 'User does not exist' })
@ApiConflictResponse({ description: 'Stale version, inactive target, or last-super-admin protection' })
@ApiServiceUnavailableResponse({ description: 'Storage unavailable; no partial mutation is committed' })
@RateLimit(RateLimitCategory.ADMIN_MUTATION) @Controller('api/admin/users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @Get() @ApiOperation({ summary: 'List profiles by role and active status' }) @ApiOkResponse({ type: AdminUserListResponseDto })
  list(@Query() query: UserListDto) { return this.users.list(query); }
  @Get(':id') @ApiOperation({ summary: 'View an active or deactivated user profile' }) @ApiOkResponse({ type: AdminUserResponseDto })
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.users.get(id); }
  @Patch(':id') @Permissions('users:update') @ApiOperation({ summary: 'Update profile details or verification with optimistic concurrency' }) @ApiOkResponse({ type: AdminUserResponseDto })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateUserDto, @Req() req: AuthenticatedRequest) {
    const { version, ...patch } = body;
    return this.users.mutate(req.user.id,id,'update',version,patch,req.requestId);
  }
  @Patch(':id/role') @Permissions('users:roles') @ApiOperation({ summary: 'Assign a role (super admin only); audit records actor and before/after roles atomically' }) @ApiOkResponse({ type: AdminUserResponseDto })
  role(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: AssignRoleDto, @Req() req: AuthenticatedRequest) {
    return this.users.mutate(req.user.id,id,'role',body.version,{ role: body.role },req.requestId);
  }
  @Post(':id/deactivate') @Permissions('users:deactivate') @ApiOperation({ summary: 'Deactivate a user; subsequent API and RLS access is denied' }) @ApiCreatedResponse({ type: AdminUserResponseDto })
  deactivate(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: UserVersionDto, @Req() req: AuthenticatedRequest) {
    return this.users.mutate(req.user.id,id,'deactivate',body.version,{},req.requestId);
  }
}
