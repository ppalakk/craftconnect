const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "..")));

app.get("/login", (req, res) => {
    res.render("login");
});

app.get('/register', (req, res) => {
    res.render('register');
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

app.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            craft,
            state,
            password,
            confirmPassword
        } = req.body;

        if (!name || !email || !phone || !craft || !state || !password || !confirmPassword) {
            return res.status(400).send("Please fill all fields");
        }
        if (password !== confirmPassword) {
            return res.status(400).send("Passwords do not match");
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send("Email already registered");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            phone,
            craft,
            state,
            password: hashedPassword
        });
        await user.save();
        res.redirect("/login");
    } catch (error) {
        console.error(error);
        res.status(500).send("Registration failed");
    }
});

app.listen(PORT, () => {
    console.log(`CraftConnect backend running at http://localhost:${PORT}`);
});