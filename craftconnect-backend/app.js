const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "..")));

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    console.log("Email:", email);
    console.log("Password:", password);

    if (!email || !password) {
        return res.send("Please enter email and password.");
    }

    res.redirect("/");
});

app.listen(PORT, () => {
    console.log(`CraftConnect backend running at http://localhost:${PORT}`);
});