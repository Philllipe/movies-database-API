<h1 align="center">Movies Database API 🎥</h1>

## About The Project

This was a university assignment for _CAB230 - Web Computing_. The REST API was built using Node.js and Express.js, it utilises Swagger UI to display the documentation for the API. A MySQL database is used to retrieve information about movies and store user accounts. It allows searching capabilites with filters for movies, actors and directors. The API uses JWT for authentication and authorization for user accounts, and https for security. Signed certificates and a .env file are provided as examples only. Only movies up to 2022 are included in the database and all data was retrieved from [IMDb](https://www.imdb.com/), [Rotten Tomatoes](https://www.rottentomatoes.com/) and [metacritic](https://www.metacritic.com/).

## Technologies Used

- [Node.js](https://nodejs.org)
- [Express.js](https://expressjs.com)
- [MySQL](https://www.mysql.com)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Knex.js](https://knexjs.org)
- [JWT](https://jwt.io)

## Getting Started
You'll need [Git](https://git-scm.com), [Node.js](https://nodejs.org/en/download/) and [MySQL](https://dev.mysql.com/downloads/installer/).

## How To Use

These instructions will get the project running locally.

### Setting Up MySQL

1. Install MySQL and MySQL Workbench
2. Open MySQL Workbench and create a new connection
3. Open the connection and goto File > Open SQL Script > select the movies-database.sql file
4. Run the script to create the database and tables

### Setting Up The Server

From your command line run the following commands:

```bash
# Clone this repository
$ git clone https://github.com/Philllipe/movies-database-api.git

# Go into the repository 
$ cd movies-database-api

# Install dependencies
$ npm install

# Make sure the details in the knexfile.js match your MySQL connection details. 
# For example, if you are using the root user the knexfile.js the user should 
# be root and the password should be the password you set for the root user.

# Start the server
$ npm start
```

The server and documentation should now be available at https://localhost:8000 