// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Tour = require("../models/tourModel");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        // this will get called as soon as credit card successfully being charged
        success_url: `${req.protocol}://${req.get("host")}/my-tours/?tour=${
            req.params.tourId
        }&user=${req.user.id}&price=${tour.price}`,
        // this will get called as soon as credit card being canceled
        cancel_url: `${req.protocol}://${req.get("host")}/tour/${tour.slug}`,
        // this is going to allow us to pass in some data about the session we creating
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [
            {
                name: `${tour.name} Tour`,
                description: tour.summary,
                images: [
                    `https://www.natours.dev/img/tours/${tour.imageCover}`,
                ],
                // multiply by the amount expected to be in cents
                amount: tour.price * 100,
                currency: "usd",
                quantity: 1,
            },
        ],
    });

    // 3) Create session as response
    res.status(200).json({
        status: "success",
        session,
    });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
    // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
    const { tour, user, price } = req.query;

    if (!tour && !user && !price) return next();
    await Booking.create({ tour, user, price });

    res.redirect(req.originalUrl.split("?")[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
