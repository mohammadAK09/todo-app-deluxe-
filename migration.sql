-- Run this in the Neon SQL editor, against the database your app uses.
-- Order matters: drop the old table, create the new shape, then backfill
-- an access row for every existing task's owner.

-- 1. The old table's columns no longer apply. Existing grants are lost;
--    they were test data.
DROP TABLE IF EXISTS task_access;

-- 2. New shape: one row = one user may fully access one task.
CREATE TABLE task_access (
    id serial PRIMARY KEY,
    task_id integer NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT task_access_task_user_unique UNIQUE (task_id, user_id)
);

-- 3. Backfill. Without this every existing task becomes invisible,
--    because visibility is now driven entirely by this table.
INSERT INTO task_access (task_id, user_id)
SELECT id, created_by FROM tasks
ON CONFLICT DO NOTHING;

-- 4. Sanity checks.
SELECT COUNT(*) AS task_count FROM tasks;
SELECT COUNT(*) AS access_count FROM task_access;
-- These two should match before any sharing happens.