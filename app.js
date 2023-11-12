var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

const options = require("./knexfile.js");
const knex = require("knex")(options);
const { attachPaginate } = require("knex-paginate");
attachPaginate();

const cors = require("cors");
const swaggerUI = require("swagger-ui-express");
const swaggerDoc = require("./docs/swagger.json");

require("dotenv").config();

app.use((req, res, next) => {
  req.db = knex;
  next();
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

logger.token("res", (req, res) => {
  const headers = {};
  res.getHeaderNames().map((h) => (headers[h] = res.getHeader(h)));
  return JSON.stringify(headers);
});

app.use("/", indexRouter);
app.use("/user", usersRouter);
app.use("/", swaggerUI.serve);
app.get("/", swaggerUI.setup(swaggerDoc));

app.use(function (req, res, next) {
  res.status(404).json({ status: "error", message: "Page not found!" });
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
