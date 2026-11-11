-- Synthetic data for trying the report builder without an external database.
CREATE TABLE demo_projects (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    budget numeric(12, 2) NOT NULL
);

CREATE TABLE demo_tasks (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id integer NOT NULL REFERENCES demo_projects(id),
    title text NOT NULL,
    due_date date NOT NULL,
    completed boolean NOT NULL DEFAULT false
);

INSERT INTO demo_projects (name, budget) VALUES
    ('Website', 1200.00), ('Community event', 800.00);

INSERT INTO demo_tasks (project_id, title, due_date, completed) VALUES
    (1, 'Design', '2026-11-01', true),
    (1, 'Implementation', '2026-11-15', false),
    (2, 'Prepare programme', '2026-11-20', false);
