// review / rating /createdAt /ref to tour /ref to user

const mongoose = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, "write some review"],
        },
        rating: {
            type: Number,
            min: [1, "Rating must be above 1.0"],
            max: [5, "Rating must be bellow 5.0"],
        },
        createdAt: {
            type: Date,
            default: Date.now(),
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: "Tour",
            required: [true, "Review must belong to a tour."],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Review must belong to a user"],
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

reviewSchema.index({ user: 1, tour: 1 }, { unique: true });
// Preventing duplicate reviews on tour from the same user

reviewSchema.pre(/^find/, function (next) {
    this.populate({
        path: "user",
        select: "name photo",
    });
    next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
    // this keyword points to the current model(reviews), thats why we use statics method here (to use aggregate which works on the model)
    const stats = await this.aggregate([
        {
            $match: { tour: tourId },
            // selecting all the reviews belong to the current tour
        },
        {
            $group: {
                // group by tour
                _id: "$tour",
                nRating: { $sum: 1 },
                avgRating: { $avg: "$rating" },
            },
        },
    ]);

    if (stats.length > 0) {
        // save statistics to the current tour
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAvarage: stats[0].avgRating,
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAvarage: 4.5,
        });
    }
};

reviewSchema.post("save", function () {
    this.constructor.Review.calcAverageRatings(this.tour);
    /* 
    because bellow fnction cant access to Review now
    Review.calcAverageRatings(this.tour);

    next();
    post middleware dont have access to next() */
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
    // by this we have access to document, while "this" keyword in this block just refesh to the query
    this.r = await this.findOne();
    // by saving it to ("this"), we can access it from the post middleware(passing the data to post middleware from the pre middleware)
    next();
});

reviewSchema.post(/^findOneAnd/, async function () {
    await this.r.constructor.calcAverageRatings(this.r);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
