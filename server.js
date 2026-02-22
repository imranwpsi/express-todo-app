const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || "localhost",
        port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "postgres",
        database: process.env.PGDATABASE || "todos"
      }
);

app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ status: "error" });
  }
});

app.get("/api/todos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, completed, created_at FROM todos ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load todos" });
  }
});

app.post("/api/todos", async (req, res) => {
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  if (!title || title.length > 200) {
    return res
      .status(400)
      .json({ error: "Title is required and must be under 200 characters" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at",
      [title]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create todo" });
  }
});

app.patch("/api/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid todo id" });
  }

  const hasTitle = Object.prototype.hasOwnProperty.call(req.body, "title");
  const hasCompleted = Object.prototype.hasOwnProperty.call(
    req.body,
    "completed"
  );

  if (!hasTitle && !hasCompleted) {
    return res
      .status(400)
      .json({ error: "Provide title or completed to update" });
  }

  const fields = [];
  const values = [];

  if (hasTitle) {
    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title || title.length > 200) {
      return res
        .status(400)
        .json({ error: "Title is required and must be under 200 characters" });
    }
    values.push(title);
    fields.push(`title = $${values.length}`);
  }

  if (hasCompleted) {
    const completed = Boolean(req.body.completed);
    values.push(completed);
    fields.push(`completed = $${values.length}`);
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE todos SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING id, title, completed, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update todo" });
  }
});

app.delete("/api/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid todo id" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM todos WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const init = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  app.listen(port, () => {
    process.stdout.write(`Todo app running on http://localhost:${port}\n`);
  });
};

init().catch((error) => {
  process.stderr.write(`Failed to start server: ${error.message}\n`);
  process.exit(1);
});
