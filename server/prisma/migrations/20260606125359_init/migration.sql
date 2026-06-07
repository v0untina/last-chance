-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'teacher', 'admin');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('single_choice', 'multiple_choice', 'matching', 'short_answer');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "algorithms" (
    "algorithm_id" SERIAL NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "description" TEXT,
    "time_complexity" VARCHAR(50),
    "space_complexity" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "algorithms_pkey" PRIMARY KEY ("algorithm_id")
);

-- CreateTable
CREATE TABLE "theory_materials" (
    "material_id" SERIAL NOT NULL,
    "algorithm_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(50),
    "order_num" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theory_materials_pkey" PRIMARY KEY ("material_id")
);

-- CreateTable
CREATE TABLE "tests" (
    "test_id" SERIAL NOT NULL,
    "algorithm_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("test_id")
);

-- CreateTable
CREATE TABLE "questions" (
    "question_id" SERIAL NOT NULL,
    "test_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "explanation" TEXT,
    "correct_answer" TEXT,
    "order_num" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "options" (
    "option_id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order_num" INTEGER NOT NULL,

    CONSTRAINT "options_pkey" PRIMARY KEY ("option_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "task_id" SERIAL NOT NULL,
    "algorithm_id" INTEGER NOT NULL,
    "material_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "starter_code" TEXT,
    "correct_answer" TEXT,
    "language" VARCHAR(20) DEFAULT 'javascript',
    "order_num" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "progress_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "algorithm_id" INTEGER NOT NULL,
    "theory_completed" BOOLEAN NOT NULL DEFAULT false,
    "test_completed" BOOLEAN NOT NULL DEFAULT false,
    "practice_completed" BOOLEAN NOT NULL DEFAULT false,
    "score_percent" INTEGER,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("progress_id")
);

-- CreateTable
CREATE TABLE "test_attempts" (
    "attempt_id" SERIAL NOT NULL,
    "test_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'in_progress',
    "score" INTEGER NOT NULL DEFAULT 0,
    "max_score" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "user_answers" (
    "answer_id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answer_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateTable
CREATE TABLE "user_solutions" (
    "solution_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "language" VARCHAR(20) NOT NULL DEFAULT 'javascript',
    "result" VARCHAR(100),
    "score" INTEGER NOT NULL DEFAULT 0,
    "execution_time" INTEGER,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "submission_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_solutions_pkey" PRIMARY KEY ("solution_id")
);

-- CreateTable
CREATE TABLE "ai_feedbacks" (
    "feedback_id" SERIAL NOT NULL,
    "solution_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "prompt_type" VARCHAR(50) NOT NULL,
    "prompt_content" TEXT NOT NULL,
    "ai_response" TEXT NOT NULL,
    "provider_used" VARCHAR(50) NOT NULL,
    "tokens_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedbacks_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "algorithms_slug_key" ON "algorithms"("slug");

-- CreateIndex
CREATE INDEX "algorithms_category_idx" ON "algorithms"("category");

-- CreateIndex
CREATE INDEX "algorithms_difficulty_idx" ON "algorithms"("difficulty");

-- CreateIndex
CREATE INDEX "algorithms_slug_idx" ON "algorithms"("slug");

-- CreateIndex
CREATE INDEX "theory_materials_algorithm_id_order_num_idx" ON "theory_materials"("algorithm_id", "order_num");

-- CreateIndex
CREATE INDEX "tests_algorithm_id_idx" ON "tests"("algorithm_id");

-- CreateIndex
CREATE INDEX "questions_test_id_order_num_idx" ON "questions"("test_id", "order_num");

-- CreateIndex
CREATE INDEX "options_question_id_order_num_idx" ON "options"("question_id", "order_num");

-- CreateIndex
CREATE INDEX "tasks_algorithm_id_idx" ON "tasks"("algorithm_id");

-- CreateIndex
CREATE INDEX "tasks_material_id_idx" ON "tasks"("material_id");

-- CreateIndex
CREATE INDEX "user_progress_user_id_idx" ON "user_progress"("user_id");

-- CreateIndex
CREATE INDEX "user_progress_algorithm_id_idx" ON "user_progress"("algorithm_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_user_id_algorithm_id_key" ON "user_progress"("user_id", "algorithm_id");

-- CreateIndex
CREATE INDEX "test_attempts_user_id_idx" ON "test_attempts"("user_id");

-- CreateIndex
CREATE INDEX "test_attempts_test_id_idx" ON "test_attempts"("test_id");

-- CreateIndex
CREATE INDEX "test_attempts_user_id_started_at_idx" ON "test_attempts"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "user_answers_attempt_id_idx" ON "user_answers"("attempt_id");

-- CreateIndex
CREATE INDEX "user_answers_question_id_idx" ON "user_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_attempt_id_question_id_key" ON "user_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "user_solutions_user_id_idx" ON "user_solutions"("user_id");

-- CreateIndex
CREATE INDEX "user_solutions_task_id_idx" ON "user_solutions"("task_id");

-- CreateIndex
CREATE INDEX "user_solutions_user_id_submission_date_idx" ON "user_solutions"("user_id", "submission_date");

-- CreateIndex
CREATE INDEX "ai_feedbacks_user_id_idx" ON "ai_feedbacks"("user_id");

-- CreateIndex
CREATE INDEX "ai_feedbacks_solution_id_idx" ON "ai_feedbacks"("solution_id");

-- CreateIndex
CREATE INDEX "ai_feedbacks_prompt_type_idx" ON "ai_feedbacks"("prompt_type");

-- CreateIndex
CREATE INDEX "ai_feedbacks_created_at_idx" ON "ai_feedbacks"("created_at");

-- AddForeignKey
ALTER TABLE "theory_materials" ADD CONSTRAINT "theory_materials_algorithm_id_fkey" FOREIGN KEY ("algorithm_id") REFERENCES "algorithms"("algorithm_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_algorithm_id_fkey" FOREIGN KEY ("algorithm_id") REFERENCES "algorithms"("algorithm_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_algorithm_id_fkey" FOREIGN KEY ("algorithm_id") REFERENCES "algorithms"("algorithm_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "theory_materials"("material_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_algorithm_id_fkey" FOREIGN KEY ("algorithm_id") REFERENCES "algorithms"("algorithm_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "test_attempts"("attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_solutions" ADD CONSTRAINT "user_solutions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_solutions" ADD CONSTRAINT "user_solutions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedbacks" ADD CONSTRAINT "ai_feedbacks_solution_id_fkey" FOREIGN KEY ("solution_id") REFERENCES "user_solutions"("solution_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedbacks" ADD CONSTRAINT "ai_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
