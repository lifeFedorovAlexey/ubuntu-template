require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const passport = require("./config-pasport");
const session = require("express-session");
const FileStore = require("session-file-store")(session);

const db = require("./db");
const PORT = process.env.API_SERVER_PORT;
const maxAge = Number(process.env.MAX_AGE_SESSION);

const Neighbor = require("./models/neighbor");

(async function start() {
  console.log(currentTime() + " - API загружается");
  try {
    await db.connect();
    await startAPI();
    console.log(currentTime() + " - API запущено");
  } catch (err) {
    console.log(err);
  }
})();

async function startAPI() {
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json({ extended: true }));
  app.use(
    session({
      secret: process.env.VK_SESSION_SECRET,
      store: new FileStore(),
      cookie: {
        path: "/",
        httpOnly: true,
        maxAge,
      },
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // require('./routes')(app);

  app.get("/", (req, res) => {
    res.send(`
      <a href='/auth/vkontakte' style="display: block;
      text-align: center;">
        <button style='background-color: #4eb562;
          border: none;
          border-radius: 10px;
          padding: 25px;
          color: #fff;
          box-shadow: 0 0 4px 1px #454941;
          outline: none!important;
          font-size: 20pt;
          outline: none!important;'>
            Войти
        </button>
      </a>`);
  });

  app.get("/authfail", (req, res) => {
    res.send(`
      <p style="
        background-color: red;
        border: none;
        border-radius: 10px;
        padding: 25px;
        color: #fff;
        box-shadow: 0 0 4px 1px #454941;
        font-size: 20pt;
        outline: none!important;
        text-align: center;">
          Вам не доступны права на просмотр
        </p>
        <a href='/' style="display: block;
        text-align: center;">
        <button style='background-color: #4eb562;
          border: none;
          border-radius: 10px;
          padding: 25px;
          color: #fff;
          box-shadow: 0 0 4px 1px #454941;
          outline: none!important;
          font-size: 20pt;
          outline: none!important;'>
            Главная
        </button>
      </a>`);
  });

  app.get("/auth/vkontakte", passport.authenticate("vkontakte"));

  app.get(
    "/auth/vkontakte/callback",
    passport.authenticate("vkontakte", {
      successRedirect: "/neighbors",
      failureRedirect: "/",
    })
  );

  const auth = (req, res, next) => {
    if (req.isAuthenticated()) {
      console.log("аутентифицирован");
      next();
    } else {
      console.log("не аутентифицирован");
      return res.redirect("/authfail");
    }
  };

  app.use("/neighbors", auth, express.static("dist"));

  app.get("/api/isAuth", auth, (req, res) => {
    res.status(200).send("авторизован");
  });
  app.get("/api/neighbors", auth, async (req, res) => {
    res.send(await Neighbor.find());
  });

  app.post("/api/updateNeighbors", auth, (req, res) => {
    req.body.neihbors.map(async (neihbor) => {
      await Neighbor.updateOne(
        { _id: neihbor._id },
        { $set: neihbor },
        { upsert: true }
      );
    });
    res.status(200);
  });

  app.post("/api/updateNeighbor", auth, async (req, res) => {
    let neighbor = {};
    neighbor._id = req.body.neighbor._id ? req.body.neighbor._id : "";
    neighbor.id = req.body.neighbor.id ? req.body.neighbor.id : "";
    neighbor.first_name = req.body.neighbor.first_name
      ? req.body.neighbor.first_name
      : "";
    neighbor.last_name = req.body.neighbor.last_name
      ? req.body.neighbor.last_name
      : "";
    neighbor.front_door = req.body.neighbor.front_door
      ? req.body.neighbor.front_door
      : "";
    neighbor.housing = req.body.neighbor.housing
      ? req.body.neighbor.housing
      : "";
    neighbor.stage = req.body.neighbor.stage ? req.body.neighbor.stage : "";
    neighbor.apartment_number = req.body.neighbor.apartment_number
      ? req.body.neighbor.apartment_number
      : "";
    neighbor.owner = req.body.neighbor.owner ? req.body.neighbor.owner : false;

    res
      .status(200)
      .send(
        await Neighbor.updateOne(
          { _id: neighbor._id },
          { $set: neighbor },
          { upsert: true }
        )
      );
  });

  app.get("/api/userinfo", auth, function(req, res) {
    res.send({
      id: req.user.id,
      familyName: req.user.familyName,
      givenName: req.user.givenName,
      photo: req.user.photo,
      profileUrl: req.user.profileUrl,
    });
  });

  app.listen(PORT, () => {
    console.log("API Запущен, порт: " + PORT);
  });
}

function currentTime() {
  const date = new Date();
  const time =
    date.getFullYear() +
    "-" +
    Number.parseInt(date.getMonth() + 1) +
    "-" +
    date.getDate() +
    " " +
    date.getHours() +
    ":" +
    date.getMinutes() +
    ":" +
    date.getSeconds();
  return time;
}
