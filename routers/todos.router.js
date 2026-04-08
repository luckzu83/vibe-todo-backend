const express = require("express");
const mongoose = require("mongoose");
const Todo = require("../models/Todo");

const router = express.Router();

async function listTodos(req, res, next) {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 }).lean();
    res.json({ todos });
  } catch (err) {
    next(err);
  }
}

router.get("/", listTodos);

router.post("/", async (req, res, next) => {
  try {
    const { title } = req.body ?? {};
    if (title === undefined || title === null) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (typeof title !== "string") {
      res.status(400).json({ error: "title must be a string" });
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      res.status(400).json({ error: "title cannot be empty" });
      return;
    }

    const todo = await Todo.create({ title: trimmed });
    res.status(201).json(todo.toJSON());
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }

    const body = req.body ?? {};
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(body, "title")) {
      const { title } = body;
      if (title === null || title === undefined) {
        res.status(400).json({ error: "title cannot be null" });
        return;
      }
      if (typeof title !== "string") {
        res.status(400).json({ error: "title must be a string" });
        return;
      }
      const trimmed = title.trim();
      if (!trimmed) {
        res.status(400).json({ error: "title cannot be empty" });
        return;
      }
      updates.title = trimmed;
    }

    if (Object.prototype.hasOwnProperty.call(body, "completed")) {
      if (typeof body.completed !== "boolean") {
        res.status(400).json({ error: "completed must be a boolean" });
        return;
      }
      updates.completed = body.completed;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "no fields to update" });
      return;
    }

    const todo = await Todo.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!todo) {
      res.status(404).json({ error: "todo not found" });
      return;
    }

    res.json(todo);
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof mongoose.Error.CastError) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }

    const todo = await Todo.findByIdAndDelete(id).lean();
    if (!todo) {
      res.status(404).json({ error: "todo not found" });
      return;
    }

    res.json({ deleted: true, todo });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    next(err);
  }
});

module.exports = router;
module.exports.listTodos = listTodos;
