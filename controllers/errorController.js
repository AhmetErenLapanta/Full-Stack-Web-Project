const appError = require("../utils/appError");

const sendErrorDev = (err, req, res) => {
    // originalUrl is the rout, or url without host
    if (req.originalUrl.startsWith("/api")) {
        // for API
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            stack: err.stack,
            err: err,
        });
    }
    // for UI
    res.status(err.statusCode).render("error", {
        title: "Something went wrong!",
        msg: err.message,
    });
};

const sendErrorProd = (err, req, res) => {
    // operational, trusted error: send message to client
    if (req.originalUrl.startsWith("/api")) {
        // A) Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            });
        }
        // B) Programming or other unknown error: don't leak error details
        // 1) Log error
        console.error("ERROR 💥", err);
        // 2) Send generic message
        return res.status(500).json({
            status: "error",
            message: "Something went very wrong!",
        });
    }
    // B) RENDERED WEBSITE
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).render("error", {
            title: "Something went wrong!",
            msg: err.message,
        });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error("ERROR 💥", err);
    // 2) Send generic message
    return res.status(err.statusCode).render("error", {
        title: "Something went wrong!",
        msg: "Please try again later.",
    });
};

const handleCastErrorDB = (err) => {
    return new appError(`Invalid ${err.path}: ${err.value}`, 400);
};
const handleDuplicateFieldsDB = (err) => {
    const value = err.keyValue.name;

    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new appError(message, 400);
};
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);

    const message = `Invalid input data. ${errors.join(". ")}`;
    return new appError(message, 400);
};

const handleJWTError = () =>
    new appError("Invalid token. Please log in again", 401);

const handleJWTExpiredError = () =>
    new appError("Your token has expired, please login again!", 401);
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (process.env.NODE_ENV === "development") {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === "production") {
        // unknown paths, duplicate input and notvalid input errors coming from mongoose shoul be marked as isOperational:true as well
        // 1) UNKNOWN PATHS (cast error)
        let error = { ...err };
        // somehow this copy has no message in it, so the next line required
        error.message = err.message;
        // copying error into object to play around, this is a good practice
        if (error.name === "CastError") error = handleCastErrorDB(error);
        // this func gonna return error created as our own appError class
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === "ValidationError")
            error = handleValidationErrorDB(error);
        if (error.name === "JsonWebTokenError") error = handleJWTError();
        if (error.name === "TokenExpiredError") error = handleJWTExpiredError();
        sendErrorProd(error, req, res);
    }
};
