-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "password_is_temporary" BOOLEAN NOT NULL DEFAULT false,
    "password_removed_at" TIMESTAMPTZ(3),
    "home_city" TEXT,
    "bike" TEXT,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider","provider_account_id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "route_slug" TEXT NOT NULL,
    "leader_id" TEXT NOT NULL,
    "leaves_on" DATE NOT NULL,
    "back_on" DATE NOT NULL,
    "from_city" TEXT NOT NULL,
    "places" INTEGER NOT NULL,
    "pace" TEXT NOT NULL,
    "who_can_join" TEXT NOT NULL,
    "asks" TEXT,
    "chat_link" TEXT,
    "nights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_company" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_members" (
    "trip_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "asked_at" TIMESTAMPTZ(3) NOT NULL,
    "answered_at" TIMESTAMPTZ(3),

    CONSTRAINT "trip_members_pkey" PRIMARY KEY ("trip_id","user_id")
);

-- CreateTable
CREATE TABLE "trip_flags" (
    "trip_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trip_flags_pkey" PRIMARY KEY ("trip_id","user_id")
);

-- CreateTable
CREATE TABLE "fact_reports" (
    "id" TEXT NOT NULL,
    "route_slug" TEXT NOT NULL,
    "fact_id" TEXT NOT NULL,
    "fact_title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "change_kind" TEXT,
    "note" TEXT,
    "seen_on" DATE NOT NULL,
    "name" TEXT,
    "user_id" TEXT,
    "status" TEXT NOT NULL,
    "editor_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),

    CONSTRAINT "fact_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_reports" (
    "id" TEXT NOT NULL,
    "route_slug" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "bike" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "name" TEXT,
    "user_id" TEXT,
    "status" TEXT NOT NULL,
    "editor_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "note" TEXT,
    "name" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_email_at_idx" ON "login_attempts"("email", "at");

-- CreateIndex
CREATE INDEX "trips_route_slug_leaves_on_idx" ON "trips"("route_slug", "leaves_on");

-- CreateIndex
CREATE INDEX "trips_leader_id_idx" ON "trips"("leader_id");

-- CreateIndex
CREATE INDEX "trip_members_user_id_idx" ON "trip_members"("user_id");

-- CreateIndex
CREATE INDEX "fact_reports_route_slug_status_idx" ON "fact_reports"("route_slug", "status");

-- CreateIndex
CREATE INDEX "fact_reports_user_id_idx" ON "fact_reports"("user_id");

-- CreateIndex
CREATE INDEX "trip_reports_route_slug_idx" ON "trip_reports"("route_slug");

-- CreateIndex
CREATE INDEX "trip_reports_user_id_idx" ON "trip_reports"("user_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_flags" ADD CONSTRAINT "trip_flags_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_flags" ADD CONSTRAINT "trip_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_reports" ADD CONSTRAINT "fact_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_reports" ADD CONSTRAINT "trip_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
