-- Generated from pinned Better Auth 1.7.15; reviewed and applied only by isolated qualification.
create table "r2_auth_user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "twoFactorEnabled" boolean);

create table "r2_auth_session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "r2_auth_user" ("id") on delete cascade);

create table "r2_auth_account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "r2_auth_user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "r2_auth_verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "r2_auth_two_factor" ("id" text not null primary key, "secret" text not null, "backupCodes" text not null, "userId" text not null references "r2_auth_user" ("id") on delete cascade, "verified" boolean, "failedVerificationCount" integer, "lockedUntil" timestamptz);

create table "r2_auth_rate_limit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "r2_auth_session_userId_idx" on "r2_auth_session" ("userId");

create index "r2_auth_account_userId_idx" on "r2_auth_account" ("userId");

create index "r2_auth_verification_identifier_idx" on "r2_auth_verification" ("identifier");

create index "r2_auth_two_factor_secret_idx" on "r2_auth_two_factor" ("secret");

create index "r2_auth_two_factor_userId_idx" on "r2_auth_two_factor" ("userId");