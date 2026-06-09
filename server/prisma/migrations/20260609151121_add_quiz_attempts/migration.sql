-- CreateTable
CREATE TABLE "quiz_attempts" (
    "attempt_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "algorithm_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "selected_answer" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_algorithm_id_idx" ON "quiz_attempts"("user_id", "algorithm_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_material_id_idx" ON "quiz_attempts"("user_id", "material_id");

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
