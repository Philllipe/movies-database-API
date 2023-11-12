require("dotenv").config();
var express = require("express");
var router = express.Router();

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require("bcrypt");
const authorization = require("../middleware/authorization");

router.post("/login", function (req, res, next) {
  // 1. Retrieve email and password from req.body
  const email = req.body.email;
  const password = req.body.password;
  const longExipry = req.body.longExipry || false;
  const bearerExpiresInSeconds = req.body.bearerExpiresInSeconds || 600;
  const refreshExpiresInSeconds = req.body.refreshExpiresInSeconds || 86400;

  // 2. Verify body
  if (!email || email === undefined || !password || password === undefined) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required",
    });
    return;
  }

  // 3. Determine if user already exists in table
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("email", "=", email);
  queryUsers
    .then((users) => {
      if (users.length === 0) {
        throw new Error("Incorrect email or password");
      }
      // 4. Verify password matches
      const user = users[0];
      return bcrypt.compare(password, user.hash);
    })
    .then((match) => {
      if (!match) {
        throw new Error("Incorrect email or password");
      }
      // 5. Generate new bearer token and refresh token
      const bearerExp = Math.floor(Date.now() / 1000) + bearerExpiresInSeconds;
      const refreshExp =
        Math.floor(Date.now() / 1000) + refreshExpiresInSeconds;
      const bearerToken = jwt.sign(
        { email, bearerExp, token_type: "Bearer" },
        JWT_SECRET
      );
      const refreshToken = jwt.sign(
        { email, refreshExp, token_type: "Refresh" },
        JWT_SECRET
      );
      // 6. insert refresh token into users table 'refreshToken' column
      req.db
        .from("users")
        .where("email", "=", email)
        .update({ refreshToken: refreshToken })
        .then(() => {
          res.status(200).json({
            bearerToken: {
              token: bearerToken,
              token_type: "Bearer",
              expires_in: bearerExpiresInSeconds,
            },
            refreshToken: {
              token: refreshToken,
              token_type: "Refresh",
              expires_in: refreshExpiresInSeconds,
            },
          });
        });
    })
    .catch((e) => {
      console.log("=============ERROR============" + e);
      res.status(401).json({ error: true, message: e.message });
    });
});

router.post("/register", function (req, res, next) {
  // Retrieve email and password from req.body
  const email = req.body.email;
  const password = req.body.password;

  // Verify body
  if (!email || email === undefined || !password || password === undefined) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password needed",
    });
    return;
  }
  // Determine if user already exists in table
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("email", "=", email);
  queryUsers
    .then((users) => {
      if (users.length > 0) {
        throw new Error("User already exists");
      }
      // Insert user into DB
      const saltRounds = 10;
      const hash = bcrypt.hashSync(password, saltRounds);
      return req.db.from("users").insert({ email, hash });
    })
    .then(() => {
      res
        .status(201)
        .json({ error: false, message: "User successfully created" });
    })
    .catch((e) => {
      console.log("=============ERROR============" + e);
      res.status(409).json({ error: true, message: e.message });
    });
});

// Example Value: {  "refreshToken": "ajsonwebtoken"}
// Ensure the refresh token in the request body matches the one in the database
// Verify the refresh token is not expired
// Generate a new bearer token and refresh token
router.post("/refresh", function (req, res, next) {
  const refreshToken = req.body.refreshToken;
  const bearerExpiresInSeconds = 600;
  const refreshExpiresInSeconds = 86400;

  // Verify body
  if (!refreshToken) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, refresh token required",
    });
    return;
  }

  // Determine if user already exists in table
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("refreshToken", "=", refreshToken);
  queryUsers
    .then((users) => {
      if (users.length === 0 || !users[0].refreshToken) {
        console.log("heres");
        throw new Error("Invalid JWT token");
      }
      // Verify refresh token is not expired
      const user = users[0];
      const email = user.email;
      const now = Math.floor(Date.now() / 1000);

      jwt.verify(refreshToken, JWT_SECRET, (err, decoded) => {
        if (err || decoded.token_type !== "Refresh") {
          console.log("heres2");
          throw new Error("Invalid JWT token");
        }
        if (now > decoded.refreshExp) {
          throw new Error("JWT token has expired");
          return;
        }
        // Generate new bearer token and refresh token
        const bearerExp =
          Math.floor(Date.now() / 1000) + bearerExpiresInSeconds;
        const refreshExp =
          Math.floor(Date.now() / 1000) + refreshExpiresInSeconds;
        const bearerToken = jwt.sign(
          { email, bearerExp, token_type: "Bearer" },
          JWT_SECRET
        );
        const refreshToken = jwt.sign(
          { email, refreshExp, token_type: "Refresh" },
          JWT_SECRET
        );
        // insert refresh token into users table 'refreshToken' column
        req.db
          .from("users")
          .where("email", "=", email)
          .update({ refreshToken: refreshToken })
          .then(() => {
            res.status(200).json({
              bearerToken: {
                token: bearerToken,
                token_type: "Bearer",
                expires_in: bearerExpiresInSeconds,
              },
              refreshToken: {
                token: refreshToken,
                token_type: "Refresh",
                expires_in: refreshExpiresInSeconds,
              },
            });
          });
      });
    })
    .catch((e) => {
      res.status(401).json({ error: true, message: e.message });
    });
});

router.post("/logout", function (req, res, next) {
  const refreshToken = req.body.refreshToken;

  // Verify body
  if (!refreshToken) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, refresh token required",
    });
    return;
  }

  // Determine if user already exists in table
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("refreshToken", "=", refreshToken);
  queryUsers
    .then((users) => {
      if (users.length === 0 || !users[0].refreshToken) {
        throw new Error("Invalid JWT token");
      }
      // Verify refresh token is not expired
      const user = users[0];
      const email = user.email;
      const now = Math.floor(Date.now() / 1000);

      jwt.verify(refreshToken, JWT_SECRET, (err, decoded) => {
        if (err || decoded.token_type !== "Refresh") {
          throw new Error("Invalid JWT token");
        }
        if (now > decoded.refreshExp) {
          throw new Error("JWT token has expired");
        }

        req.db
          .from("users")
          .where("email", "=", email)
          .update({ refreshToken: null })
          .then(() => {
            res.status(200).json({
              error: false,
              message: "Token successfully invalidated",
            });
            return;
          });
      });
    })
    .catch((e) => {
      res.status(401).json({ error: true, message: e.message });
    });
});

// Returns the user's profile information
router.get("/:email/profile", authorization, function (req, res, next) {
  const email = req.params.email;

  // Verify body
  if (!email) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, email required",
    });
  }

  // Determine if user already exists in table
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("email", "=", email);
  queryUsers
    .then((users) => {
      if (users.length === 0) {
        throw new Error();
      }
      if (res.locals.email) {
        const profile = {
          email: users[0].email,
          firstName: users[0].firstName,
          lastName: users[0].lastName,
          dob: users[0].dob,
          address: users[0].address,
        };
        res.status(200).json(profile);
      } else {
        const profile = {
          email: users[0].email,
          firstName: users[0].firstName,
          lastName: users[0].lastName,
        };
        res.status(200).json(profile);
      }
    })
    .catch((e) => {
      res.status(404).json({ error: true, message: "User not found" });
    });
});

router.put("/:email/profile", authorization, function (req, res, next) {
  if (!res.locals.email) {
    res.status(401).json({
      error: true,
      message: "Authorization header ('Bearer token') not found",
    });
    return;
  }

  if (res.locals.email !== req.params.email) {
    res.status(403).json({
      error: true,
      message: "Forbidden",
    });
    return;
  }

  const email = req.params.email;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const dob = req.body.dob;
  const address = req.body.address;

  // Verify body
  if (!email || !firstName || !lastName || !dob || !address) {
    res.status(400).json({
      error: true,
      message:
        "Request body incomplete: firstName, lastName, dob and address are required.",
    });
    return;
  }

  // Ensure all fields are strings
  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof dob !== "string" ||
    typeof address !== "string"
  ) {
    res.status(400).json({
      error: true,
      message:
        "Request body invalid: firstName, lastName and address must be strings only.",
    });
    return;
  }

  // Ensure date of birth is in the correct format: YYYY-MM-DD
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dobRegex.test(dob)) {
    res.status(400).json({
      error: true,
      message: "Invalid input: dob must be a real date in format YYYY-MM-DD.",
    });
    return;
  }

  // FUNCTION MODIFIED FROM: https://www.scaler.com/topics/date-validation-in-javascript/
  function isValidDate(date) {
    // Date format: YYYY-MM-DD
    var datePattern = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/;

    // Check if the date string format is a match
    var matchArray = date.match(datePattern);
    if (matchArray == null) {
      return false;
    }

    // Remove any non digit characters
    var dateString = date.replace(/\D/g, "");

    // Parse integer values from the date string
    var year = parseInt(dateString.substr(0, 4));
    var month = parseInt(dateString.substr(4, 2));
    var day = parseInt(dateString.substr(6, 2));

    // Ensure date is not in the future
    var now = new Date();
    if (year > now.getFullYear()) {
      res.status(400).json({
        error: true,
        message: "Invalid input: dob must be a date in the past.",
      });
      return;
    }

    // Define the number of days per month
    var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Leap years
    if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0)) {
      daysInMonth[1] = 29;
    }

    if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
      return false;
    }
    return true;
  }

  // Ensure that the date of birth is a real date, Example: 2021-04-31 is not a real date
  if (!isValidDate(dob)) {
    res.status(400).json({
      error: true,
      message: "Invalid input: dob must be a real date in format YYYY-MM-DD.",
    });
    return;
  }
  // Determine if user already exists in table
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("email", "=", email);
  queryUsers
    .then((users) => {
      if (users.length === 0) {
        throw new Error();
      }
      // Update user's profile
      req.db
        .from("users")
        .where("email", "=", email)
        .update({ firstName, lastName, dob, address })
        .then(() => {
          res.status(200).json({
            email: email,
            firstName: firstName,
            lastName: lastName,
            dob: dob,
            address: address,
          });
        });
    })
    .catch((e) => {
      res.status(404).json({ error: true, message: "User not found" });
    });
});

module.exports = router;
