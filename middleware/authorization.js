const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  if (
    !("authorization" in req.headers) ||
    !req.headers.authorization.match(/^Bearer /)
  ) {
    next();
    return;
  }
  const token = req.headers.authorization.replace(/^Bearer /, "");
  // Verify JWT and check expiration date
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.token_type !== "Bearer") {
      res.status(401).json({ error: true, message: "Invalid JWT Token" });
      return;
    }
    if (Math.floor(Date.now() / 1000) > decoded.bearerExp) {
      throw new Error();
    }
    res.locals.email = decoded.email;
  } catch (e) {
    res.status(401).json({ error: true, message: "Invalid JWT token" });
    return;
  }
  next();
};
