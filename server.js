const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
    console.log(err.name, err.message);
    console.log("UNCAUGHT REJECTION! Shutting down...");

    process.exit(1);
});

dotenv.config({
    path: "./config.env",
});
const app = require("./app");

mongoose
    .connect(process.env.DATABASE_LOCAL, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
    })
    .then((con) => {
        console.log("Local DB Server has connected successfully! [server.js]");
    })
    .catch((err) => console.log(err));

const port = process.env.PORT;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
    console.log(err.name, err.message);
    console.log("UNHNANDLED REJECTION! Shutting down...");
    server.close(() => {
        process.exit(1);
    });
});
