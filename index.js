require("dotenv").config();

const path = require("node:path");
const express = require("express");
const mongoose = require("mongoose");

require("./models/Todo");

const todosRouter = require("./routers/todos.router");

/**
 * macOS는 시스템이 5000을 쓰는 경우가 많아(AirPlay 등) Express가 안 뜨고 404·CORS 오류만 납니다.
 * 프론트 todo-firebase/app.js 의 API_PORT 와 반드시 같게 유지하세요.
 */
const PORT = Number(process.env.PORT) || 5001;

function buildMongoUri() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.MONGO_URI || process.env.MONGODB_URI) {
    return process.env.MONGO_URI || process.env.MONGODB_URI;
  }
  const db = process.env.MONGODB_DB || "todo";
  const host = process.env.MONGODB_HOST || "127.0.0.1";
  const port = process.env.MONGODB_PORT || "27017";
  const user = process.env.MONGODB_USER;
  const pass = process.env.MONGODB_PASSWORD;

  if (user && pass) {
    const encodedUser = encodeURIComponent(user);
    const encodedPass = encodeURIComponent(pass);
    return `mongodb://${encodedUser}:${encodedPass}@${host}:${port}/${db}`;
  }

  return `mongodb://${host}:${port}/${db}`;
}

function isAllowedDevOrigin(origin) {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    const parts = host.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n > 255)) {
      return false;
    }
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  } catch {
    return false;
  }
}

function createApp() {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader("X-App", "todo-backend");
    next();
  });

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isAllowedDevOrigin(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PATCH,DELETE,OPTIONS,HEAD"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      return res.status(204).end();
    }
    next();
  });

  app.use(express.json());

  app.get("/favicon.ico", (req, res) => {
    res.status(204).end();
  });

  app.get("/health", (req, res) => {
    const dbOk = mongoose.connection.readyState === 1;
    res.json({ ok: true, db: dbOk });
  });

  app.get("/todos", todosRouter.listTodos);
  app.use("/todos", todosRouter);

  const webRoot = path.join(__dirname, "..", "todo-firebase");
  app.use(express.static(webRoot));

  app.use((req, res) => {
    const origin = req.headers.origin;
    if (origin && isAllowedDevOrigin(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.status(404).json({ error: "not found", path: req.originalUrl });
  });

  app.use((err, req, res, next) => {
    if (!res.headersSent) {
      const origin = req.headers.origin;
      if (origin && isAllowedDevOrigin(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

const mongooseConnectOptions = {
  serverSelectionTimeoutMS: 25_000,
};

async function main() {
  const uri = buildMongoUri();
  await mongoose.connect(uri, mongooseConnectOptions);
  console.log("연결 성공");

  const app = createApp();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`API: http://127.0.0.1:${PORT}/todos  (응답 헤더 X-App: todo-backend)`);
    console.log(`웹 앱: http://127.0.0.1:${PORT}/`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`포트 ${PORT} 사용 중입니다. 다른 node 종료 후 다시 실행하세요.`);
    }
    process.exit(1);
  });
}

main().catch((err) => {
  console.error("MongoDB 연결 실패:", err.message);
  if (process.env.DYNO) {
    console.error(
      "[Heroku] Atlas → Network Access → IP Access List 에 0.0.0.0/0 추가(임시·개발용) 또는 Atlas IP Access 에서 클라우드 제공업체 허용."
    );
    console.error(
      "[Heroku] Settings → Config Vars 에 MONGO_URI(또는 DATABASE_URL) 전체 mongodb+srv://... 문자열이 있는지 확인(.env 파일은 배포되지 않음)."
    );
  }
  process.exit(1);
});
