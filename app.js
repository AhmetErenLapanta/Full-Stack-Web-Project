const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./Routes/tourRoutes");
const userRouter = require("./Routes/userRoutes");
const reviewRouter = require("./Routes/reviewRoutes");
const viewRouter = require("./Routes/viewRoutes");
const bookingRouter = require("./Routes/bookingRoutes");
const app = express();
app.use(cors());

// MIDDLEWARES
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(cors());
app.options("*", cors());
// app.options('/api/v1/tours/:id', cors());

// serving static files
app.use(express.static(path.join(__dirname, "public")));
// by using express.static we define all the static assets will always be automatically served from a folder called "public"

// Set security HTTP headers
app.use(helmet());
/* helmet is a collection of multiple middlewares */

// development logging
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// how many request per IP we are gonna allow
const limiter = rateLimit({
    max: 200,
    windowMs: 60 * 60 * 1000,
    message: "Too many request from this IP, please try again in an hour",
    // 200 request from the same IP in 1 hour
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body and limiting to be not more than 10kb
app.use(
    express.json({
        limit: "10kb",
    })
);

// if we need to parse the data in url encoded form
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// parsing the data from the cookies
app.use(cookieParser());

//  Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

/* imagine atackers insert some html code with attached a js code so that it can create really damage
using this middleware we prevent that by actually converting all the html symbols*/

// Prevent parameter pollution
app.use(
    hpp({
        whitelist: [
            "duration",
            "ratingsQuantity",
            "ratingsAverage",
            "maxGroupSize",
            "difficulty",
            "price",
        ],
    })
);
/* whitelist is the list of parameters we allow to duplicate in the query string */

// Mounting the route
app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

// handling undefined routes, this middleware executes if any previous route didnt executed
app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// if you give four argument, express recognizes it as a error handling middleware
app.use(globalErrorHandler);

module.exports = app;
