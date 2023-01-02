const express = require("express");
const viewController = require("../controllers/viewController");
const authController = require("../controllers/authController");
const bookingController = require("../controllers/bookingController");

const router = express.Router();

router.get("/", authController.isLoggedIn, viewController.getOverview);
router.get("/tour/:slug", authController.isLoggedIn, viewController.getTour);
router.get("/login", authController.isLoggedIn, viewController.getLoginForm);
router.get("/me", authController.protect, viewController.getAccount);

router.get(
    "/my-tours",
    bookingController.createBookingCheckout,
    authController.protect,
    viewController.getMyTours
);
// for alternative submit user account settings form handler
router.post(
    "/submit-user-data",
    authController.protect,
    viewController.updateUserData
);

module.exports = router;
