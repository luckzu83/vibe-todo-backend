const mongoose = require("mongoose");
const todoSchema = require("./todo.schema");

module.exports = mongoose.model("Todo", todoSchema);
