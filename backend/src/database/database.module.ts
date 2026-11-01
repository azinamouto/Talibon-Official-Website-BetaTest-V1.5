import { DynamicModule, Module } from '@nestjs/common';
import { connectionConfig, PostgresDatabase } from './postgres';
import { PgRepositories } from './repositories';

export const PUBLIC_CONTENT_REPOSITORY = Symbol('PublicContentRepository');
export const MEDIA_REPOSITORY = Symbol('MediaRepository');
export const STAFF_REPOSITORY = Symbol('StaffRepository');
export const AUDIT_REPOSITORY = Symbol('AuditRepository');

// Deliberately not imported by AppModule until the auth/storage/cutover gates are met.
@Module({})
export class DatabaseModule {
  static register(): DynamicModule {
    const tokens = [PUBLIC_CONTENT_REPOSITORY, MEDIA_REPOSITORY, STAFF_REPOSITORY, AUDIT_REPOSITORY];
    return {
      module: DatabaseModule,
      providers: [
        { provide: PostgresDatabase, useFactory: () => new PostgresDatabase(connectionConfig(process.env.DATABASE_URL)) },
        { provide: PgRepositories, inject: [PostgresDatabase], useFactory: (db: PostgresDatabase) => new PgRepositories(db) },
        ...tokens.map(provide => ({ provide, useExisting: PgRepositories })),
      ],
      exports: tokens,
    };
  }
}
