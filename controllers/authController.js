const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const jwt = require("jsonwebtoken");
const AppError = require("./../utils/appError");
const Email = require("./../utils/email");
const { promisify } = require("util");
const crypto = require("crypto");

const signToken = (id) => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        // secure: true,
        // the cookie will sent only on a encrypted connection
        httpOnly: true,
        // means, we can not manipulate the cookie in the browser in any way,not even delete it
        // so in log out we will send back a cookie with exact same name but without JWT
    };
    if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

    res.cookie("jwt", token, cookieOptions);

    user.password = undefined;
    // just to hide password in the response

    res.status(statusCode).json({
        status: "success",
        token,
        data: {
            user,
        },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
    });

    // const url = `${req.protocol}://${req.get("host")}/me`;
    const url = `${req.protocol}://${req.get("host")}/`;
    await new Email(newUser, url).sendWelcome();

    // creating Token
    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if email and password exists
    if (!email || !password) {
        return next(new AppError("Please provide email and password!", 400));
    }

    // Check if the user exists and password is correct
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError("Incorrect Email or Password", 401));
    }
    // If ok send token to client back

    createSendToken(user, 200, res);
});

// Sending back jwt with same name but invalid (random) token
exports.logout = (req, res) => {
    res.cookie("jwt", "logged out", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ status: "success" });
};

// Only for API
exports.protect = catchAsync(async (req, res, next) => {
    // 1 Get the token and check if exist
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    if (!token) {
        return next(new AppError("You are not logged in!", 401));
    }
    // 2 verificate token

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // 3 if the user still exists
    // in case user logged in and deleted account but token still there
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(
            new AppError(
                "The user belonging to this token does no longer exist.",
                401
            )
        );
    }
    // 4 check if user change password after the jwt was issued
    // iat: issued at
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                "User recently changed password! Please log in again",
                401
            )
        );
    }

    req.user = currentUser;

    res.locals.user = currentUser;
    // acces to protected route
    next();
});

// only for rendered pages, so there will be no errors
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // Verify token
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET
            );

            // Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }

            // Check if user changed password after the token was issued
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            // THERE IS A LOGGED IN USER
            res.locals.user = currentUser;
            // giving locals user object to the UI
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    "You have no permission to perform this action",
                    403
                )
            );
        }
        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1 Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError("There is no user with email address.", 404));
    }
    // 2 Generate random reset token
    const resetToken = user.createPasswordResetToken();
    // everything related to user and password we always use save instead of findandupdate
    // because we want to run all the validators and save middleware(for encrypting)
    await user.save({ validateBeforeSave: false });
    // 3 Send it to user's email
    try {
        const resetURL = `${req.protocol}://${req.get(
            "host"
        )}/api/v1/users/resetPassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset();

        res.status(200).json({
            status: "success",
            message: "Token sent to email",
        });
    } catch {
        user.PasswordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                "There was an error sending the email. Try again later",
                500
            )
        );
    }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
    // find the user based on jwt
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    const user = await User.findOne({
        passwodResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    // if token has not expired and there is a user, set new password
    if (!user) {
        return next(new AppError("Token is invalid or has expired", 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.PasswordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.markModified("password");
    await user.save();
    // log the user in,send JWT

    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // find user by id from collection
    const user = await User.findById(req.user.id).select("+password");

    // check if POSTed password is correct
    if (
        !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
        return next(new AppError("Your current password is wrong", 401));
    }
    // if so update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;

    await user.save();

    // Log the user in via sending JWT
    createSendToken(user, 200, res);
});
