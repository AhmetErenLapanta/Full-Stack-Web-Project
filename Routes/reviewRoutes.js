const express = require("express");
const Router = express.Router({ mergeParams: true });
// {mergeParams:true} so that we have access to the request parameters (tourId etc.)
const reviewController = require("../controllers/reviewController");
const authController = require("../controllers/authController");

Router.use(authController.protect);

// POST /tour/133fd134/reviews
// POST /reviews
// now bot of them redirected to here 2. from app.js 1.from tourRoutes.js

Router.route("/")
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo("user"),
        reviewController.setToUserIds,
        reviewController.createReview
    );

Router.route("/:id")
    .get(reviewController.getReview)
    .delete(
        authController.restrictTo("user", "admin"),
        reviewController.deleteReview
    )
    .patch(
        authController.restrictTo("user", "admin"),
        reviewController.updateReview
    );

module.exports = Router;
