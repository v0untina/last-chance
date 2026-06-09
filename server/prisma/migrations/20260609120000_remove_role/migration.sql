-- DropForeignKey
ALTER TABLE "user_progress" DROP CONSTRAINT IF EXISTS "user_progress_user_id_fkey";
ALTER TABLE "user_solutions" DROP CONSTRAINT IF EXISTS "user_solutions_user_id_fkey";
ALTER TABLE "test_attempts" DROP CONSTRAINT IF EXISTS "test_attempts_user_id_fkey";
ALTER TABLE "ai_feedbacks" DROP CONSTRAINT IF EXISTS "ai_feedbacks_user_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_users_role";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role";

-- DropEnum
DROP TYPE IF EXISTS "UserRole";

-- RestoreForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_solutions" ADD CONSTRAINT "user_solutions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_feedbacks" ADD CONSTRAINT "ai_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
