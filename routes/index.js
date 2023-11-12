var express = require("express");
var router = express.Router();

const authorization = require("../middleware/authorization");

router.get("/movies/search", function (req, res, next) {
  const title = req.query.title;

  if (req.query.page && !req.query.page.match(/^\d+$/)) {
    res.status(400).json({
      error: true,
      message: "Invalid page format. page must be a number.",
    });
    return;
  }
  const page = parseInt(req.query.page) || 1;

  if (req.query.year && !req.query.year.match(/^\d{4}$/)) {
    res.status(400).json({
      error: true,
      message: "Invalid year format. Format must be yyyy.",
    });
    return;
  }
  const year = parseInt(req.query.year);

  req.db
    .from("basics")
    .select("*")
    .modify(function (queryBuilder) {
      if (title) {
        queryBuilder.where("primaryTitle", "like", `%${title}%`);
      }
    })
    .modify(function (queryBuilder) {
      if (year) {
        queryBuilder.where("year", "=", year);
      }
    })
    .paginate({ perPage: 100, currentPage: page, isLengthAware: true })
    .then((rows) => {
      res.status(200).json({
        data: rows.data.map((movie) => ({
          title: movie.primaryTitle,
          year: movie.year,
          imdbID: movie.tconst,
          imdbRating: parseFloat(movie.imdbRating),
          rottenTomatoesRating: parseFloat(movie.rottentomatoesRating),
          metacriticRating: parseFloat(movie.metacriticRating),
          classification: movie.rated,
        })),
        pagination: rows.pagination,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({
        error: true,
        message: "Invalid year format. Format must be yyyy.",
      });
    });
});

router.get("/movies/data/:imdbID", function (req, res, next) {
  // ensure there are no query parameters
  if (Object.keys(req.query).length > 0) {
    res.status(400).json({
      error: true,
      message: "Query parameters are not permitted.",
    });
    return;
  }

  const imdbID = req.params.imdbID;

  req.db
    .from("basics")
    .select("*")
    .where("tconst", "=", imdbID)
    .then((rows) => {
      if (rows.length > 0) {
        const movie = rows[0];
        req.db
          .from("principals")
          .select("*")
          .where("tconst", "=", imdbID)
          .then((rows) => {
            const principals = rows.map((principal) => ({
              id: principal.nconst,
              category: principal.category,
              name: principal.name,
              characters: principal.characters
                ? principal.characters
                    .replace("[", "")
                    .replace("]", "")
                    .replace(/"/g, "")
                    .split(",")
                : [],
            }));
            req.db
              .from("ratings")
              .select("*")
              .where("tconst", "=", imdbID)
              .then((rows) => {
                const ratings = rows.map((rating) => ({
                  source: rating.source,
                  value: parseFloat(rating.value),
                }));
                res.status(200).json({
                  title: movie.primaryTitle,
                  year: movie.year,
                  runtime: movie.runtimeMinutes,
                  genres: movie.genres.split(","),
                  country: movie.country,
                  principals: principals,
                  ratings: ratings,
                  boxoffice: movie.boxoffice,
                  poster: movie.poster,
                  plot: movie.plot,
                });
              });
          });
      } else {
        res.status(404).json({
          error: true,
          message: "No record exists of a movie with this ID",
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({
        error: true,
        message:
          "Invalid query parameters: year. Query parameters are not permitted.",
      });
    });
});

router.get("/people/:id", authorization, function (req, res, next) {
  if (!res.locals.email) {
    res.status(401).json({
      error: true,
      message: "Authorization header ('Bearer token') not found",
    });
    return;
  }

  if (Object.keys(req.query).length > 0) {
    res.status(400).json({
      error: true,
      message: "Query parameters are not permitted.",
    });
    return;
  }

  const id = req.params.id;

  req.db
    .from("names")
    .select("*")
    .where("nconst", "=", id)
    .then((rows) => {
      if (rows.length > 0) {
        const person = rows[0];
        req.db
          .from("basics")
          .select("*")
          .join("principals", "basics.tconst", "principals.tconst")
          .where("principals.nconst", "=", id)
          .then((rows) => {
            const movies = rows.map((movie) => ({
              movieName: movie.primaryTitle,
              movieId: movie.tconst,
              category: movie.category,
              characters: movie.characters
                ? movie.characters
                    .replace("[", "")
                    .replace("]", "")
                    .replace(/"/g, "")
                    .split(",")
                : [],
              imdbRating: parseFloat(movie.imdbRating),
            }));
            res.status(200).json({
              name: person.primaryName,
              birthYear: person.birthYear,
              deathYear: person.deathYear,
              roles: movies,
            });
          });
      } else {
        res.status(404).json({
          error: true,
          message: "No record exists of a person with this ID",
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({
        error: true,
        message:
          "Invalid query parameters: year. Query parameters are not permitted.",
      });
    });
});

module.exports = router;
