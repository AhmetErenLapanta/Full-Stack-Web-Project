const express = require("express");
const Router = express.Router();
const tourController = require("../controllers/tourControllers");
const authController = require("../controllers/authController");
// const reviewContoller = require("../controllers/reviewController");
const reviewRouter = require("./reviewRoutes");

Router.route("/top-5-cheap").get(
    tourController.aliasTopTours,
    tourController.getAllTours
);
Router.route("/tour-stats").get(tourController.getTourStats);

Router.route("/monthly-plan/:year").get(
    authController.protect,
    authController.restrictTo("admin", "lead-guide", "guide"),
    tourController.getMonthlyPlan
);

Router.route("/tours-within/:distance/center/:latlng/unit/:unit").get(
    tourController.getToursWithin
);

Router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

Router.route("/")
    .get(tourController.getAllTours)
    .post(
        tourController.checkBody,
        authController.restrictTo("admin", "lead-guide"),
        tourController.createTour
    );
Router.route("/:id")
    .get(tourController.getTour)
    .patch(
        authController.protect,
        authController.restrictTo("admin", "lead-guide"),
        tourController.uploadTourImages,
        // tourController.resizeTourImages,
        tourController.updateTour
    )
    .delete(
        authController.protect,
        authController.restrictTo("admin", "lead-guide"),
        tourController.deleteTour
    );

Router.use("/:tourId/reviews", reviewRouter);
// you use "use" keyword so that every request post,get etc will be handled with reviewRouter

module.exports = Router;
