const express = require("express"); //加载express
const expressHandlebars = require("express-handlebars"); //加载hbs
const sqlite3 = require("sqlite3"); //加载db
const expressSession = require("express-session"); //加载session用于登录，使用session的id来验证cookie
const TOOLS_TITLE_MAX_LENGTH = 25;
const MY_USERNAME = "Bosai"; //用户名
const MY_PASSWORD = "123456"; //密码
const bcryptjs = require("bcryptjs"); //使用哈希加密
const bodyParser = require("body-parser");
const hashPassword = bcryptjs.hashSync(MY_PASSWORD, 10); //使用哈希加密后得出的哈希密码

const isTrue = bcryptjs.compareSync(
  MY_PASSWORD,
  "$2a$10$S1f/lxitVD.1uYW6YbCh.OBZYc/ejXXKamM31ePtRUylRjT.hQara"
);

const db = new sqlite3.Database("bosai-database.db"); //创建db

//get是选择查询发送回数据库，如果从数据库返回一个
//all是返回多个
//run是查询对数据库的更改
//如果没有IF NOT EXISTS，就会崩溃，因为之前运行已经创建过了一样的了
db.run(`
	CREATE TABLE IF NOT EXISTS tools (
		id INTEGER PRIMARY KEY,
		title TEXT,
		grade INTEGER
	)
`);

//启用express
const app = express();

//启用hbs，默认的主页layout为main.hbs
app.engine(
  "hbs",
  expressHandlebars.engine({
    defaultLayout: "main.hbs",
  })
);

//静态加载public里面的文件
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

//将secret传入cookie并且解析出来
//启用Session的secret来让服务器辨别你是否为本人登录
//会返回session的id和value，来确认是否是本人登录，而不是直接返回登录名和密码
app.use(
  expressSession({
    saveUninitialized: false, //保持未初始化，需要为faslse
    resave: false, //重新保存，需要为faslse
    secret: "$2a$10$S1f/lxitVD.1uYW6YbCh.OBZYc/ejXXKamM31ePtRUylRjT.hQara", //设置一个随机的字符串，这个控制会话的ID
  })
);

//启用本地的session
app.use(function (request, response, next) {
  response.locals.session = request.session;
  next();
});
// --------------------------------------------------------------------------------------------------
//把start.hbs链接到“/”
app.get("/start", function (request, response) {
  response.render("start.hbs");
});

app.get("/tools", function (request, response) {
  //暂停它的选择选项
  const read = `SELECT * FROM tools`; //read
  //这是一个异步函数
  //将此查询发送到数据库，但是数据库需要些时间从新发回给我们，所以下面的js需要继续运行
  //首先发送数据库等待响应，如果错误也能报错，使用异步函数为了提高它的运行效率
  db.all(read, function (error, tools) {
    const errorMessages = [];
    //如果报错
    if (error) {
      errorMessages.push("Internal server error, check the code!");
    }
    //否则就正常运行
    const model = {
      errorMessages,
      tools,
    };

    response.render("tools.hbs", model);
  });
});
// --------------------------------------------------------------------------------------------------

//把tool.hbs链接到
app.get("/tools/create", function (request, response) {
  response.render("create-tool.hbs");
});

//使用post来创建
app.post("/tools/create", function (request, response) {
  //用来请求数据库的title
  //用来请求数据库的grade
  const title = request.body.title;
  const grade = parseInt(request.body.grade, 10);
  //用一个list来装errorMessages
  const errorMessages = [];

  //如果title为空的话
  if (title == "") {
    errorMessages.push("The title can not be blank");
  }

  //用来检查grade使用按照要求来填写
  if (isNaN(grade)) {
    errorMessages.push("You did not enter a grade number");
  } else if (grade < 0) {
    errorMessages.push("The grade cannot be negative");
  } else if (10 < grade) {
    errorMessages.push("The highest grade of Grade is 10");
  }
  //用来控制如果想要，然后提示Not logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("Not logged in yet");
  }

  if (errorMessages.length == 0) {
    //这里使用？也是一样的，防止SQL注入
    const crea = `
			INSERT INTO tools (title, grade) VALUES (?, ?)
		`; //create
    const createval = [title, grade];

    //创建db表，如果错误的提示
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
// --------------------------------------------------------------------------------------------------

//把tool.hbs链接到
app.get("/tools/update", function (request, response) {
  response.render("update-tool.hbs");
});

//使用post来创建
app.post("/tools/update", function (request, response) {
  //用来请求数据库的title
  //用来请求数据库的grade
  const title = request.body.title;
  const grade = parseInt(request.body.grade, 10);
  //用一个list来装errorMessages
  const errorMessages = [];
  //如果title为空的话

  if (title == "") {
    errorMessages.push("The title can not be blank");
  }

  //用来检查grade使用按照要求来填写
  if (isNaN(grade)) {
    errorMessages.push("You did not enter a grade number");
  } else if (grade < 0) {
    errorMessages.push("The grade cannot be negative");
  } else if (10 < grade) {
    errorMessages.push("The highest grade of Grade is 10");
  }

  //用来控制如果想要，然后提示Not logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("Not logged in yet");
  }

  if (errorMessages.length == 0) {
    //这里使用？也是一样的，防止SQL注入
    const upd = `
    UPDATE tools SET grade = ? WHERE title = ?
		`;
    const updval = [grade, title];

    //创建db表，如果错误的提示
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

// --------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------

//把tool.hbs链接到
app.get("/tools/delete", function (request, response) {
  response.render("delete-tool.hbs");
});

//使用post来创建
app.post("/tools/delete", function (request, response) {
  //用来请求数据库的title
  //用来请求数据库的grade
  const title = request.body.title;
  const grade = parseInt(request.body.grade, 10);
  //用一个list来装errorMessages
  const errorMessages = [];
  //如果title为空的话
  if (title == "") {
    errorMessages.push("The title can not be blank");
  }

  //用来控制如果想要，然后提示Not logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("Not logged in yet");
  }

  if (errorMessages.length == 0) {
    //这里使用？也是一样的，防止SQL注入
    const del = `
    DELETE FROM tools WHERE title = ?
		`;
    const delval = [title];

    //创建db表，如果错误的提示
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

// --------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------

//使用id来去跳转到对应的网页，就是点击工具了，之后自动跳转到那里去
app.get("/tools/:id", function (request, response) {
  const id = request.params.id;
  //使用？来防止SQL注入，如果直接使用${id}会产生注入，可能会被注入一些文件。这点是跟PHP是一样的
  const sel = `SELECT * FROM tools WHERE id = ?`;
  //上面的那个问号只不过是占位符而已
  const selval = [id];

  db.get(sel, selval, function (error, tool) {
    const model = {
      tool,
    };

    response.render("tool.hbs", model);
  });
});

//把login.hbs链接到/login
app.get("/login", function (request, response) {
  response.render("login.hbs");
});

//使用post来发送username和password
app.post("/login", function (request, response) {
  const username = request.body.username;
  const password = request.body.password;
  //如果都为正确的话
  if (isTrue) {
    if (username == MY_USERNAME && password == MY_PASSWORD) {
      request.session.isLoggedIn = true;
    }
    response.redirect("/start");
  } else {
    const model = {
      failedToLogin: true,
    };
    //没成功继续在这个页面
    response.render("login.hbs", model);
  }
});

//把contact.hbs链接到/contact
app.get("/contact", function (request, response) {
  response.render("contact.hbs");
});

//把page2.hbs链接到/page2
app.get("/page2", function (request, response) {
  response.render("page2.hbs");
});

//把about.hbs链接到/about
app.get("/about", function (request, response) {
  response.render("about.hbs");
});

//把链接到/penetrationtools
app.get("/penetrationtools", function (request, response) {
  response.render("penetrationtools.hbs");
});

//把链接到/informationcollectio
app.get("/informationcollection", function (request, response) {
  response.render("informationcollection.hbs");
});

//把链接到/vulnerabilityutilization
app.get("/vulnerabilityutilization", function (request, response) {
  response.render("vulnerabilityutilization.hbs");
});

app.listen(8080);
