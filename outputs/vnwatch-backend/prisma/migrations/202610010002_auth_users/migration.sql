CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

CREATE TABLE "users" (
  "id" UUID NOT NULL PRIMARY KEY,
  "email" VARCHAR(254) NOT NULL,
  "display_name" VARCHAR(80) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "users_email_normalized" CHECK (email = lower(btrim(email))),
  CONSTRAINT "users_failed_attempts_range" CHECK (failed_login_attempts BETWEEN 0 AND 5)
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_created_at_id_idx" ON "users"("created_at", "id");

CREATE TABLE "user_sessions" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "token_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),
  CONSTRAINT "user_sessions_valid_expiry" CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");
CREATE INDEX "user_sessions_user_id_revoked_at_expires_at_idx" ON "user_sessions"("user_id", "revoked_at", "expires_at");

CREATE TABLE "password_reset_tokens" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "token_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "consumed_at" TIMESTAMPTZ(3),
  CONSTRAINT "password_reset_tokens_valid_expiry" CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_consumed_at_idx" ON "password_reset_tokens"("user_id", "consumed_at");

CREATE TABLE "auth_rate_buckets" (
  "key_hash" CHAR(64) NOT NULL PRIMARY KEY,
  "hits" INTEGER NOT NULL DEFAULT 1 CHECK (hits > 0),
  "expires_at" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "auth_rate_buckets_expires_at_idx" ON "auth_rate_buckets"("expires_at");

CREATE TABLE "audit_events" (
  "id" UUID NOT NULL PRIMARY KEY,
  "actor_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "target_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "action" VARCHAR(64) NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "reason" VARCHAR(200),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_events_target_user_id_created_at_idx" ON "audit_events"("target_user_id", "created_at");
