-- CreateTable
CREATE TABLE "ask_answers" (
    "id" TEXT NOT NULL,
    "route_slug" TEXT,
    "kind" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "facts" JSONB NOT NULL,
    "embedding" BYTEA,
    "copied_from" TEXT,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "useful" BOOLEAN,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ask_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ask_uses" (
    "day" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ask_uses_pkey" PRIMARY KEY ("day","who")
);

-- CreateTable
CREATE TABLE "ask_reports" (
    "id" TEXT NOT NULL,
    "answer_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),

    CONSTRAINT "ask_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ask_answers_route_slug_kind_created_at_idx" ON "ask_answers"("route_slug", "kind", "created_at");

-- CreateIndex
CREATE INDEX "ask_answers_created_at_idx" ON "ask_answers"("created_at");

-- CreateIndex
CREATE INDEX "ask_reports_status_created_at_idx" ON "ask_reports"("status", "created_at");

-- AddForeignKey
ALTER TABLE "ask_reports" ADD CONSTRAINT "ask_reports_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "ask_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
