-- =====================================================
-- ER-диаграмма: Электронный учебник «Алгоритмы и СД»
-- Сгенерировано из Prisma-схемы (PostgreSQL 15)
-- =====================================================
-- Использование:
--   1. Импортируйте этот файл в тулзу для ER-диаграмм:
--      - DBeaver     → File → Import → ER Diagram
--      - DataGrip    → File → New → Diagram → + Add Tables
--      - pgAdmin     → Tools → ERD Tool → Import
--      - dbdiagram.io → Paste DDL → Generate Diagram
--      - dbdocs      → dbdocs build er_diagram.sql
--   2. Либо выполните на реальной БД:
--      psql -U user -d dbname -f er_diagram.sql
-- =====================================================

-- Отключаем проверку FK для пересоздания
SET session_replication_role = 'replica';

-- =====================================================
-- ENUMS
-- =====================================================

DROP TYPE IF EXISTS difficulty_level CASCADE;
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

DROP TYPE IF EXISTS question_type CASCADE;
CREATE TYPE question_type AS ENUM ('single_choice', 'multiple_choice', 'matching', 'short_answer');

DROP TYPE IF EXISTS attempt_status CASCADE;
CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'abandoned');

-- =====================================================
-- TABLES
-- =====================================================

CREATE TABLE users (
    user_id       SERIAL       PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

COMMENT ON TABLE  users                  IS 'Пользователи системы (только student)';
COMMENT ON COLUMN users.password_hash    IS 'Хеш пароля (bcrypt)';


CREATE TABLE algorithms (
    algorithm_id     SERIAL           PRIMARY KEY,
    slug             VARCHAR(100)     NOT NULL UNIQUE,
    name             VARCHAR(150)     NOT NULL,
    category         VARCHAR(100)     NOT NULL,
    difficulty       difficulty_level NOT NULL,
    description      TEXT,
    time_complexity  VARCHAR(50),
    space_complexity VARCHAR(50),
    created_at       TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_algorithms_category   ON algorithms(category);
CREATE INDEX idx_algorithms_difficulty ON algorithms(difficulty);
CREATE INDEX idx_algorithms_slug       ON algorithms(slug);

COMMENT ON TABLE  algorithms                 IS 'Алгоритмы (bubble-sort, insertion-sort, selection-sort, binary-search)';
COMMENT ON COLUMN algorithms.slug            IS 'Уникальный URL-идентификатор';
COMMENT ON COLUMN algorithms.time_complexity IS 'Напр. O(n²)';
COMMENT ON COLUMN algorithms.space_complexity IS 'Напр. O(1)';


CREATE TABLE theory_materials (
    material_id  SERIAL       PRIMARY KEY,
    algorithm_id INTEGER      NOT NULL REFERENCES algorithms(algorithm_id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL,
    content      TEXT         NOT NULL,
    type         VARCHAR(50),
    order_num    INTEGER      NOT NULL,
    quiz         JSON         DEFAULT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_theory_materials_alg_order ON theory_materials(algorithm_id, order_num);

COMMENT ON TABLE  theory_materials       IS 'Теоретические материалы (6 блоков на алгоритм)';
COMMENT ON COLUMN theory_materials.type  IS 'Тип блока: text, video, example, ...';
COMMENT ON COLUMN theory_materials.quiz  IS 'Встроенные вопросы для самопроверки (JSON)';


CREATE TABLE tests (
    test_id       SERIAL       PRIMARY KEY,
    algorithm_id  INTEGER      NOT NULL REFERENCES algorithms(algorithm_id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    passing_score INTEGER      NOT NULL DEFAULT 70,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tests_algorithm ON tests(algorithm_id);

COMMENT ON TABLE  tests                    IS 'Тесты по алгоритмам';
COMMENT ON COLUMN tests.passing_score      IS 'Процент правильных ответов для сдачи';


CREATE TABLE questions (
    question_id    SERIAL        PRIMARY KEY,
    test_id        INTEGER       NOT NULL REFERENCES tests(test_id) ON DELETE CASCADE,
    question_text  TEXT          NOT NULL,
    question_type  question_type NOT NULL,
    explanation    TEXT,
    correct_answer TEXT,
    order_num      INTEGER       NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_test_order ON questions(test_id, order_num);

COMMENT ON TABLE  questions                 IS 'Вопросы тестов';
COMMENT ON COLUMN questions.question_type   IS 'single_choice, multiple_choice, matching, short_answer';
COMMENT ON COLUMN questions.correct_answer  IS 'Правильный ответ (для short_answer)';


CREATE TABLE options (
    option_id    SERIAL    PRIMARY KEY,
    question_id  INTEGER   NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    option_text  TEXT      NOT NULL,
    is_correct   BOOLEAN   NOT NULL DEFAULT FALSE,
    order_num    INTEGER   NOT NULL
);

CREATE INDEX idx_options_question_order ON options(question_id, order_num);

COMMENT ON TABLE  options              IS 'Варианты ответов для single/multiple_choice';
COMMENT ON COLUMN options.is_correct   IS 'Флаг правильности варианта';


CREATE TABLE tasks (
    task_id        SERIAL       PRIMARY KEY,
    algorithm_id   INTEGER      NOT NULL REFERENCES algorithms(algorithm_id) ON DELETE CASCADE,
    material_id    INTEGER      REFERENCES theory_materials(material_id) ON DELETE SET NULL,
    name           VARCHAR(200) NOT NULL,
    description    TEXT         NOT NULL,
    starter_code   TEXT,
    correct_answer TEXT,
    tests          JSON         DEFAULT '[]',
    language       VARCHAR(20)  DEFAULT 'javascript',
    order_num      INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_algorithm   ON tasks(algorithm_id);
CREATE INDEX idx_tasks_material    ON tasks(material_id);

COMMENT ON TABLE  tasks                IS 'Практические задания';
COMMENT ON COLUMN tasks.starter_code   IS 'Начальный код в редакторе';
COMMENT ON COLUMN tasks.correct_answer IS 'Эталонное решение';
COMMENT ON COLUMN tasks.tests          IS 'Тест-кейсы для проверки (JSON-массив)';


CREATE TABLE user_progress (
    progress_id        SERIAL    PRIMARY KEY,
    user_id            INTEGER   NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    algorithm_id       INTEGER   NOT NULL REFERENCES algorithms(algorithm_id) ON DELETE CASCADE,
    theory_completed   BOOLEAN   NOT NULL DEFAULT FALSE,
    test_completed     BOOLEAN   NOT NULL DEFAULT FALSE,
    practice_completed BOOLEAN   NOT NULL DEFAULT FALSE,
    score_percent      INTEGER,
    completed_at       TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, algorithm_id)
);

CREATE INDEX idx_user_progress_user      ON user_progress(user_id);
CREATE INDEX idx_user_progress_algorithm ON user_progress(algorithm_id);

COMMENT ON TABLE  user_progress                IS 'Прогресс пользователя по алгоритмам';
COMMENT ON COLUMN user_progress.score_percent  IS 'Итоговый процент выполнения';


CREATE TABLE test_attempts (
    attempt_id   SERIAL          PRIMARY KEY,
    test_id      INTEGER         NOT NULL REFERENCES tests(test_id) ON DELETE CASCADE,
    user_id      INTEGER         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status       attempt_status  NOT NULL DEFAULT 'in_progress',
    score        INTEGER         NOT NULL DEFAULT 0,
    max_score    INTEGER         NOT NULL DEFAULT 0,
    passed       BOOLEAN         NOT NULL DEFAULT FALSE,
    started_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_test_attempts_user    ON test_attempts(user_id);
CREATE INDEX idx_test_attempts_test    ON test_attempts(test_id);
CREATE INDEX idx_test_attempts_user_ts ON test_attempts(user_id, started_at);

COMMENT ON TABLE  test_attempts          IS 'Попытки прохождения теста';
COMMENT ON COLUMN test_attempts.status   IS 'in_progress, completed, abandoned';
COMMENT ON COLUMN test_attempts.passed   IS 'score >= tests.passing_score';


CREATE TABLE user_answers (
    answer_id   SERIAL    PRIMARY KEY,
    attempt_id  INTEGER   NOT NULL REFERENCES test_attempts(attempt_id) ON DELETE CASCADE,
    question_id INTEGER   NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    answer_text TEXT      NOT NULL,
    is_correct  BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_user_answers_attempt  ON user_answers(attempt_id);
CREATE INDEX idx_user_answers_question ON user_answers(question_id);

COMMENT ON TABLE  user_answers            IS 'Ответы пользователя на вопросы теста';
COMMENT ON COLUMN user_answers.is_correct  IS 'Проверка: answer_text = questions.correct_answer';


CREATE TABLE user_solutions (
    solution_id     SERIAL       PRIMARY KEY,
    user_id         INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    task_id         INTEGER      NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    code            TEXT         NOT NULL,
    language        VARCHAR(20)  NOT NULL DEFAULT 'javascript',
    result          VARCHAR(100),
    score           INTEGER      NOT NULL DEFAULT 0,
    execution_time  INTEGER,
    is_correct      BOOLEAN      NOT NULL DEFAULT FALSE,
    submission_date TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_solutions_user ON user_solutions(user_id);
CREATE INDEX idx_user_solutions_task ON user_solutions(task_id);
CREATE INDEX idx_user_solutions_user_ts ON user_solutions(user_id, submission_date);

COMMENT ON TABLE  user_solutions              IS 'Решения практических заданий';
COMMENT ON COLUMN user_solutions.result        IS 'Результат выполнения (success/error)';
COMMENT ON COLUMN user_solutions.execution_time IS 'Время выполнения в мс';


CREATE TABLE ai_feedbacks (
    feedback_id    SERIAL       PRIMARY KEY,
    solution_id    INTEGER      REFERENCES user_solutions(solution_id) ON DELETE SET NULL,
    user_id        INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    prompt_type    VARCHAR(50)  NOT NULL,
    prompt_content TEXT         NOT NULL,
    ai_response    TEXT         NOT NULL,
    provider_used  VARCHAR(50)  NOT NULL,
    tokens_used    INTEGER,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_feedbacks_user     ON ai_feedbacks(user_id);
CREATE INDEX idx_ai_feedbacks_solution ON ai_feedbacks(solution_id);
CREATE INDEX idx_ai_feedbacks_type     ON ai_feedbacks(prompt_type);
CREATE INDEX idx_ai_feedbacks_created  ON ai_feedbacks(created_at);

COMMENT ON TABLE  ai_feedbacks               IS 'Логи AI-фидбека (подсказки, ревью кода, вопросы)';
COMMENT ON COLUMN ai_feedbacks.prompt_type   IS 'hint, code_review, generate_question, ...';
COMMENT ON COLUMN ai_feedbacks.provider_used IS 'openai / gigachat';


CREATE TABLE quiz_attempts (
    attempt_id      SERIAL    PRIMARY KEY,
    user_id         INTEGER   NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    algorithm_id    INTEGER   NOT NULL,
    material_id     INTEGER   NOT NULL,
    question_text   TEXT      NOT NULL,
    selected_answer TEXT      NOT NULL,
    correct_answer  TEXT      NOT NULL,
    is_correct      BOOLEAN   NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user_alg ON quiz_attempts(user_id, algorithm_id);
CREATE INDEX idx_quiz_attempts_user_mat ON quiz_attempts(user_id, material_id);

COMMENT ON TABLE  quiz_attempts               IS 'Попытки ответов на AI-генерированные вопросы по теории';
COMMENT ON COLUMN quiz_attempts.question_text  IS 'Текст вопроса';
COMMENT ON COLUMN quiz_attempts.selected_answer IS 'Ответ пользователя';
COMMENT ON COLUMN quiz_attempts.correct_answer  IS 'Правильный ответ';

-- =====================================================
-- Включаем проверку FK обратно
-- =====================================================

SET session_replication_role = 'origin';
