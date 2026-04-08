const mongoose = require("mongoose");

/** MongoDB 컬렉션 `todos`에 대응하는 스키마 (SQL의 "테이블" 역할) */
const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

todoSchema.index({ createdAt: -1 });

module.exports = todoSchema;
