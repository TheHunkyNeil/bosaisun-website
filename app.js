const express = require("express"); //load express
const expressHandlebars = require("express-handlebars"); //load hbs
const sqlite3 = require("sqlite3"); //load db
const expressSession = require("express-session"); //Load the session for login, use the session id to verify the cookie
const TOOLS_TITLE_MAX_LENGTH = 25;
const MY_USERNAME = "Bosai"; //username
const MY_PASSWORD = "123456"; //password
const bcryptjs = require("bcryptjs"); //use hash encryption
const bodyParser = require("body-parser");
const hashPassword = bcryptjs.hashSync(MY_PASSWORD, 10); //Hash password obtained after using hash encryption

const isTrue = bcryptjs.compareSync(
  MY_PASSWORD,
  "$2a$10$S1f/lxitVD.1uYW6YbCh.OBZYc/ejXXKamM31ePtRUylRjT.hQara"
);

const db = new sqlite3.Database("bosai-database.db"); //create db

//get is a select query sent back to the database, if a return from the database
//all is to return multiple
//run is the query for changes to the database
//If there is no IF NOT EXISTS, it will crash, because the previous run has already created the same
db.run(`
	CREATE TABLE IF NOT EXISTS tools (
		id INTEGER PRIMARY KEY,
		title TEXT,
		grade INTEGER
	)
`);

//enable express
const app = express();

//Enable hbs, the default home page layout is main.hbs
app.engine(
  "hbs",
  expressHandlebars.engine({
    defaultLayout: "main.hbs",
  })
);

//Statically load files in public
app.use(express.static("public"));

app.use(
  express.urlencoded({
    extended: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

// Pass the secret into the cookie and parse it out
//Enable Session's secret to let the server identify whether you are logged in for yourself
//The id and value of the session will be returned to confirm whether I am logged in, instead of directly returning the login name and password
app.use(
  expressSession({
    saveUninitialized: false, //keep uninitialized, needs to be faslse
    resave: false, //Re-save, needs to be false
    secret: "$2a$10$S1f/lxitVD.1uYW6YbCh.OBZYc/ejXXKamM31ePtRUylRjT.hQara", //Set a random string, the ID of this control session
  })
);

//Enable local session
app.use(function (request, response, next) {
  response.locals.session = request.session;
  next();
});
// --------------------------------------------------------------------------------------------------
//Link start.hbs to "/"
app.get("/", function (request, response) {
  response.render("start.hbs");
});

app.get("/tools", function (request, response) {
  //Pause it's selection option
  const read = `SELECT * FROM tools`; //read
  //this is an async function
  //Send this query to the database, but the database needs some time to send it back to us, so the js below needs to keep running
  //First send the database to wait for a response, if an error can also report an error, use an asynchronous function to improve its operating efficiency
  db.all(read, function (error, tools) {
    const errorMessages = [];
    //If an error is reported
    if (error) {
      errorMessages.push("Internal server error, check the code!");
    }
    //Otherwise it works fine
    const model = {
      errorMessages,
      tools,
    };

    response.render("tools.hbs", model);
  });
});

//Link tool.hbs to
app.get("/tools/create", function (request, response) {
  response.render("create-tool.hbs");
});

//use post to create
app.post("/tools/create", function (request, response) {
  //The title used to request the database
  //Used to request the grade of the database
  const title = request.body.title;
  const grade = parseInt(request.body.grade, 10);
  //Use a list to hold errorMessagess
  const errorMessages = [];

  // if title is empty
  if (title == "") {
    errorMessages.push("The title can not be blank");
  }

  //Used to check grade use to fill in as required
  if (isNaN(grade)) {
    errorMessages.push("You did not enter a grade number");
  } else if (grade < 0) {
    errorMessages.push("The grade cannot be negative");
  } else if (10 < grade) {
    errorMessages.push("The highest grade of Grade is 10");
  }
  //Used to control if you want, then prompt Not logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("Not logged in yet");
  }

  if (errorMessages.length == 0) {
    //used here? Same thing, preventing SQL injection
    const crea = `
			INSERT INTO tools (title, grade) VALUES (?, ?)
		`; //create
    const createval = [title, grade];

    //Create db table, if wrong prompt
    db.run(crea, createval, function (error) {
      if (error) {
        errorMessages.push("Internal server error, check the code!");

        const model = {
          errorMessages,
          title,
          grade,
        };

        response.render("create-tool.hbs", model);
      } else {
        response.redirect("/tools");
      }
    });
  } else {
    const model = {
      errorMessages,
      title,
      grade,
    };

    response.render("create-tool.hbs", model);
  }
});

//Link tool.hbs to
app.get("/tools/update", function (request, response) {
  response.render("update-tool.hbs");
});

//use post to create
app.post("/tools/update", function (request, response) {
  //The title used to request the database
  //Used to request the grade of the database
  const title = request.body.title;
  const grade = parseInt(request.body.grade, 10);
  //Use a list to install errorMessages
  const errorMessages = [];
  //if title is empty

  if (title == "") {
    errorMessages.push("The title can not be blank");
  }

  //Used to check grade use to fill in as required
  if (isNaN(grade)) {
    errorMessages.push("You did not enter a grade number");
  } else if (grade < 0) {
    errorMessages.push("The grade cannot be negative");
  } else if (10 < grade) {
    errorMessages.push("The highest grade of Grade is 10");
  }

  //Used to control if you want, then prompt Not logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("Not logged in yet");
  }

  if (errorMessages.length == 0) {
    //used here? Same thing, preventing SQL injection
    const upd = `
    UPDATE tools SET grade = ? WHERE title = ?
		`;
    const updval = [grade, title];

    //Create db table, if wrong prompt
    db.run(upd, updval, function (error) {
      if (error) {
        errorMessages.push("Internal server error, check the code!");

        const model = {
          errorMessages,
          title,
          grade,
        };

        response.render("update-tool.hbs", model);
      } else {
        response.redirect("/tools");
      }
    });
  } else {
    const model = {
      errorMessages,
      title,
      grade,
    };

    response.render("update-tool.hbs", model);
  }
});

//Link tool.hbs to
app.get("/tools/delete", function (request, response) {
  response.render("delete-tool.hbs");
});

//use post to create
app.post("/tools/delete", function (request, response) {
  //The title used to request the database
  //Used to request the grade of the database
  const title = request.body.title;
  const grade = parseInt(request.body.grade, 10);
  //Use a list to install errorMessages
  const errorMessages = [];
  //if title is empty
  if (title == "") {
    errorMessages.push("The title can not be blank");
  }

  //Used to control if you want, then prompt Not logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("Not logged in yet");
  }

  if (errorMessages.length == 0) {
    //used here? Same thing, preventing SQL injection
    const del = `
    DELETE FROM tools WHERE title = ?
		`;
    const delval = [title];

    //Create db table, if wrong prompt
    db.run(del, delval, function (error) {
      if (error) {
        errorMessages.push("Internal server error, , check the code!");

        const model = {
          errorMessages,
          title,
        };

        response.render("delete-tool.hbs", model);
      } else {
        response.redirect("/tools");
      }
    });
  } else {
    const model = {
      errorMessages,
      title,
    };

    response.render("delete-tool.hbs", model);
  }
});

//Use the id to jump to the corresponding web page, just click the tool, and then automatically jump there
app.get("/tools/:id", function (request, response) {
  const id = request.params.id;
  //use? To prevent SQL injection, if you use ${id} directly, injection will occur, and some files may be injected. This is the same as PHP
  const sel = `SELECT * FROM tools WHERE id = ?`;
  //The question mark above is just a placeholder
  const selval = [id];

  db.get(sel, selval, function (error, tool) {
    const model = {
      tool,
    };

    response.render("tool.hbs", model);
  });
});

//Link login.hbs to /login
app.get("/login", function (request, response) {
  response.render("login.hbs");
});

//Use post to send username and password
app.post("/login", function (request, response) {
  const username = request.body.username;
  const password = request.body.password;
  //if both are correct
  if (isTrue) {
    if (username == MY_USERNAME && password == MY_PASSWORD) {
      request.session.isLoggedIn = true;
    }
    response.redirect("/");
  } else {
    const model = {
      failedToLogin: true,
    };
    //Failed to continue on this page
    response.render("login.hbs", model);
  }
});

//Link contact.hbs to /contact
app.get("/contact", function (request, response) {
  response.render("contact.hbs");
});

//link page2.hbs to /page2
app.get("/page2", function (request, response) {
  response.render("page2.hbs");
});

//link about.hbs to /about
app.get("/about", function (request, response) {
  response.render("about.hbs");
});

//put the link to /penetrationtools
app.get("/penetrationtools", function (request, response) {
  response.render("penetrationtools.hbs");
});

//link to /informationcollectio
app.get("/informationcollection", function (request, response) {
  response.render("informationcollection.hbs");
});

//link to /vulnerabilityutilization
app.get("/vulnerabilityutilization", function (request, response) {
  response.render("vulnerabilityutilization.hbs");
});

app.listen(8080);
