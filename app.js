const express = require("express");
const expressHandlebars = require("express-handlebars");
const expressSession = require("express-session");
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");
const bcryptjs = require("bcryptjs");
const sqlite = require("better-sqlite3"); //npm 更好的sqlite
const SqliteStore = require("better-sqlite3-session-store")(expressSession); //
const db = new sqlite3.Database("bosai-database.db");
const sessionDB = new sqlite("sessions.db"); //
const MY_USERNAME = "Bosai";
const MY_PASSWORD_HASH =
  "$2a$10$Ze8JXRlCFAiLgw5ow1uKxem9Sqx1JOx64VY43Yb3zaFSWu11KMpMe";
const PORT = 8080;
const MIN_SCORE = 0;
const MAX_SCORE = 10;
const MIN_MESSAGES_SIZE = 0;
const DECIMAL = 10;
const app = express();

//没登录就跳转到登录界面
const verifyAuth = function (request, response, next) {
  if (!request.session.isLoggedIn) {
    return response.redirect("/login");
  }
  next();
};

//启动数据库
db.run(
  `CREATE TABLE IF NOT EXISTS tools (id INTEGER PRIMARY KEY, title TEXT, grade INTEGER)`
);

//启用hbs，默认首页布局为main.hbs
app.engine(
  "hbs",
  expressHandlebars.engine({
    defaultLayout: "main.hbs",
  })
);

//静态加载公共文件
app.use(express.static("public"));

// The following 5 lines of code were added by me watching the code in Mr. Peter Larsson Green's video
app.use(
  express.urlencoded({
    extended: false,
  })
);

// The following 14 lines of code was adapted from https://www.npmjs.com/package/better-sqlite3-session-store Accessed: 2023-01-07
app.use(
  expressSession({
    store: new SqliteStore({
      client: sessionDB,
      expired: {
        clear: true,
        intervalMs: 1000 * 60 * 60 * 24 * 2, //ms = 2 days
      },
    }),
    cookie: {
      maxAge: 60 * 60 * 24 * 2, // 2 days
    },
    saveUninitialized: true,
    resave: false,
    secret: "$2a$10$S1f/lxitVD.1uYW6YbCh.OBZYc/ejXXKamM31ePtRUylRjT.hQara",
  })
);

//启用本地会话
app.use(function (request, response, next) {
  response.locals.session = request.session;
  next();
});

//获取主页start.hbs
app.get("/", function (request, response) {
  response.render("start.hbs");
});

//工具页面
app.get("/tools", function (request, response) {
  const select = `SELECT * FROM tools`;
  db.all(select, function (error, tools) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error, check the code!");
    }
    const model = {
      errorMessages,
      tools,
    };
    response.render("tools.hbs", model);
  });
});

//将 tool.hbs 链接到
app.get("/tools/create", function (request, response) {
  response.render("create-tool.hbs");
});

//使用创建
app.post("/tools/create", function (request, response) {
  const title = request.body.title;
  const grade = parseInt(request.body.grade, DECIMAL);
  const errorMessages = [];

  if (title == "") {
    errorMessages.push("The title can not be blank");
  }

  //解决了常量10的问题
  if (isNaN(grade)) {
    errorMessages.push("You did not enter a grade");
  } else if (grade < MIN_SCORE) {
    errorMessages.push("The grade can not be negative");
  } else if (MAX_SCORE < grade) {
    errorMessages.push("The highest grade is 10");
  }

  //用于控制是否需要，然后提示未登录
  if (!request.session.isLoggedIn) {
    errorMessages.push("Not logged in yet");
  }

  if (errorMessages.length == MIN_MESSAGES_SIZE) {
    const insert = `INSERT INTO tools (title, grade) VALUES (?, ?)`; // create/insert
    const insertValue = [title, grade];

    db.run(insert, insertValue, function (error) {
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

//将 tool.hbs 链接
app.get("/tools/update", function (request, response) {
  response.render("update-tool.hbs");
});

//使用创建
app.post("/tools/update", function (request, response) {
  const title = request.body.title;
  const grade = parseInt(request.body.grade, DECIMAL);
  const errorMessages = [];

  if (title == "") {
    errorMessages.push("The title can not be blank");
  }

  //用于查看成绩 用于按要求填写
  if (isNaN(grade)) {
    errorMessages.push("You did not enter a grade");
  } else if (grade < MIN_SCORE) {
    errorMessages.push("The grade cannot be negative");
  } else if (MAX_SCORE < grade) {
    errorMessages.push("The highest grade is 10");
  }

  //用于控制是否需要，然后提示未登录
  if (!request.session.isLoggedIn) {
    errorMessages.push("Not logged in yet");
  }

  if (errorMessages.length == MIN_MESSAGES_SIZE) {
    const update = `UPDATE tools SET grade = ? WHERE title = ?`;
    const updateValue = [grade, title];
    db.run(update, updateValue, function (error) {
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

//将 tool.hbs 链接
// app.get("/tools/delete", function (request, response) {
//   const findAll = `SELECT * FROM tools`;
//   db.all(findAll, function (err, tools) {
//     const model = {
//       tools,
//     };

//     response.render("delete-tool.hbs", model);
//   });
// });

// 按id删除工具
app.get("/tools/:id/delete", function (request, response) {
  const tool_id = request.params.id;
  const deleteTool = `DELETE FROM tools WHERE id = ?`;
  const deleteToolID = [tool_id];
  db.run(deleteTool, deleteToolID, function (err) {
    response.redirect("/tools");
  });
});

//使用删除
// app.post("/tools/delete", function (request, response) {
//   const title = request.body.title;
//   const grade = parseInt(request.body.grade, DECIMAL);
//   const errorMessages = [];

//   if (title == "") {
//     errorMessages.push("The title can not be blank");
//   }
//   if (!request.session.isLoggedIn) {
//     errorMessages.push("Not logged in yet");
//   }

//   if (errorMessages.length == 0) {
//     const del = `DELETE FROM tools WHERE title = ?`;
//     const deleteValue = [title];

//     db.run(del, deleteValue, function (error) {
//       if (error) {
//         errorMessages.push("Internal server error, check the code!");

//         const model = {
//           errorMessages,
//           title,
//         };

//         response.render("delete-tool.hbs", model);
//       } else {
//         response.redirect("/tools");
//       }
//     });
//   } else {
//     const model = {
//       errorMessages,
//       title,
//     };

//     response.render("delete-tool.hbs", model);
//   }
// });

// 使用id跳转到工具反馈
app.get("/tools/:id/feedbacks", verifyAuth, function (request, response) {
  const tool_id = request.params.id;
  // 使用“select”查询获取工具的所有反馈
  const find = `SELECT * FROM feedbacks WHERE tool_id = ?`;
  const findID = [tool_id];
  db.all(find, findID, function (err, feedbacks) {
    const model = {
      feedbacks,
      tool_id,
    };
    response.render("feedbacks.hbs", model);
  });
});

// 添加新反馈
app.post("/tools/:id/feedbacks", verifyAuth, function (request, response) {
  const tool_id = request.params.id;
  const feedback = request.body.feedback;
  const insert = `INSERT INTO feedbacks (feedback, tool_id) VALUES (?, ?)`;
  const insertParams = [feedback, tool_id];
  db.run(insert, insertParams, function (err) {
    response.redirect(`/tools/${tool_id}/feedbacks`);
  });
});

// 更新反馈页面
app.get(
  "/tools/:id/feedbacks/:feedback_id/update",
  verifyAuth,
  function (request, response) {
    const tool_id = request.params.id;
    const feedback_id = request.params.feedback_id;
    const find = `SELECT * FROM feedbacks WHERE id = ?`;
    const findID = [feedback_id];
    db.get(find, findID, function (err, feedback) {
      const model = {
        feedback,
        tool_id,
      };
      response.render("feedback.hbs", model);
    });
  }
);

// 更新反馈
app.post(
  "/tools/:id/feedbacks/:feedback_id/update",
  verifyAuth,
  function (request, response) {
    const tool_id = request.params.id;
    const feedback_id = request.params.feedback_id;
    const feedback = request.body.feedback;
    const update = `UPDATE feedbacks SET feedback = ? WHERE id = ?`;
    const updateID = [feedback, feedback_id];
    db.run(update, updateID, function (err) {
      response.redirect(`/tools/${tool_id}/feedbacks`);
    });
  }
);

// 删除反馈
app.get(
  `/tools/:id/feedbacks/:feedback_id/delete`,
  verifyAuth,
  function (request, response) {
    const tool_id = request.params.id;
    const feedback_id = request.params.feedback_id;
    const deleteTag = `DELETE FROM feedbacks WHERE id = ?`;
    const deleteTagID = [feedback_id];
    db.run(deleteTag, deleteTagID, function (err) {
      response.redirect(`/tools/${tool_id}/feedbacks`);
    });
  }
);

// 使用id跳转到工具的tags页面
app.get("/tools/:id/tags", verifyAuth, function (request, response) {
  const id = request.params.id;
  // Use "select" query to get all tags of tool
  const find = `SELECT * FROM tags WHERE tool_id = ?`;
  const findID = [id];
  db.all(find, findID, function (err, tags) {
    const model = {
      tags,
      tool_id: id,
    };
    response.render("tags.hbs", model);
  });
});

// 创建新标签
app.post("/tools/:id/tags", verifyAuth, function (request, response) {
  const tool_id = request.params.id;
  const name = request.body.name;
  const insert = `INSERT INTO tags (name, tool_id) VALUES (?, ?)`;
  const insertParams = [name, tool_id];
  db.run(insert, insertParams, function (err) {
    response.redirect(`/tools/${tool_id}/tags`);
  });
});

// 更新标签页
app.get(
  "/tools/:id/tags/:tag_id/update",
  verifyAuth,
  function (request, response) {
    const tool_id = request.params.id;
    const tag_id = request.params.tag_id;
    const find = `SELECT * FROM tags WHERE id = ?`;
    const findID = [tag_id];
    db.get(find, findID, function (err, tag) {
      const model = {
        tag,
        tool_id,
      };
      response.render("tag.hbs", model);
    });
  }
);

// 更新标签
app.post(
  "/tools/:id/tags/:tag_id/update",
  verifyAuth,
  function (request, response) {
    const tool_id = request.params.id;
    const tag_id = request.params.tag_id;
    const name = request.body.name;

    const update = `UPDATE tags SET name = ? WHERE id = ?`;
    const updateParams = [name, tag_id];

    db.run(update, updateParams, function (err) {
      response.redirect(`/tools/${tool_id}/tags`);
    });
  }
);

// 删除标签
app.get(
  `/tools/:id/tags/:tag_id/delete`,
  verifyAuth,
  function (request, response) {
    const tool_id = request.params.id;
    const tag_id = request.params.tag_id;
    const deleteTag = `DELETE FROM tags WHERE id = ?`;
    const deleteTagID = [tag_id];
    db.run(deleteTag, deleteTagID, function (err) {
      response.redirect(`/tools/${tool_id}/tags`);
    });
  }
);

//使用id跳转到对应的网页，只需点击工具，然后自动跳转到那里
app.get("/tools/:id", function (request, response) {
  const id = request.params.id;
  const find = `SELECT * FROM tools WHERE id = ?`;
  const findID = [id];

  db.get(find, findID, function (error, tool) {
    const model = {
      tool,
    };

    // 获取所有标签
    const findTags = `SELECT * FROM tags WHERE tool_id = ?`;
    const findTagsID = [id];
    db.all(findTags, findTagsID, function (err, tags) {
      tool.tags = tags;

      // 获得所有反馈
      const findFeedbacks = `SELECT * FROM feedbacks WHERE tool_id = ?`;
      const findFeedbacksID = [id];
      db.all(findFeedbacks, findFeedbacksID, function (err, feedbacks) {
        tool.feedbacks = feedbacks;
        response.render("tool.hbs", model);
      });
    });
  });
});

//将 login.hbs 链接到 /login
app.get("/login", function (request, response) {
  response.render("login.hbs");
});

//使用post发送login的用户名和密码
app.post("/login", function (request, response) {
  //使用请求的用户名和密码
  const username = request.body.username;
  const password = request.body.password;

  if (
    username === MY_USERNAME &&
    bcryptjs.compareSync(password, MY_PASSWORD_HASH)
  ) {
    request.session.isLoggedIn = true;
    request.session.user = username;
    response.redirect("/");
  } else {
    const model = {
      failedToLogin: true,
    };
    response.render("login.hbs", model);
  }
});

//将 contact.hbs 链接到 /contact
app.get("/contact", function (request, response) {
  response.render("contact.hbs");
});

//将 nextpage.hbs 链接到 /nextpage
app.get("/nextpage", function (request, response) {
  response.render("nextpage.hbs");
});

//将 about.hbs 链接到 /about
app.get("/about", function (request, response) {
  response.render("about.hbs");
});

//把链接放到/penetrationtools
app.get("/penetrationtools", function (request, response) {
  response.render("penetrationtools.hbs");
});

//链接到/informationcollection
app.get("/informationcollection", function (request, response) {
  response.render("informationcollection.hbs");
});

//链接到/vulnerabilityutilization
app.get("/vulnerabilityutilization", function (request, response) {
  response.render("vulnerabilityutilization.hbs");
});

app.listen(PORT);
