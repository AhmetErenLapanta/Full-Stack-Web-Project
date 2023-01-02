const express = require("express");
const userController = require("../controllers/userControllers");
const authController = require("../controllers/authController");
// const multer = require("multer");
const Router = express.Router();

Router.post("/signup", authController.signup);
Router.post("/login", authController.login);
Router.get("/logout", authController.logout);
Router.post("/forgotPassword", authController.forgotPassword);
Router.patch("/resetPassword/:token", authController.resetPassword);

Router.use(authController.protect);
// it will protect all the routes coming after this middleware

Router.route("/updateMyPassword").patch(authController.updatePassword);
Router.route("/me").get(userController.getMe, userController.getUser);
Router.route("/updateMe").patch(
    userController.uploadUserPhoto,
    // userController.resizeUserPhoto,
    userController.updateMe
);
Router.route("/deleteMe").delete(userController.deleteMe);

Router.use(authController.restrictTo("admin"));

Router.route("/")
    .get(userController.getAllUsers)
    .post(userController.createUser);
Router.route("/:id")
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = Router;
