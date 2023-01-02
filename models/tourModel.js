const mongoose = require("mongoose");
const slugify = require("slugify");
const Review = require("./reviewModel");
// const User = require("../models/userModel");
// const validator = require("validator");

const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "A tour must have a name"],
            unique: [true, "A tour must have a unique name"],
            maxlength: [
                40,
                "A tour name must have  less or equal than 40 characters",
            ],
            minlength: [
                10,
                "A tour name must have more or equal then 10 characters",
            ],
        },
        duration: {
            type: Number,
            required: [true, "A tour must have a duration"],
        },
        maxGroupSize: {
            type: Number,
            required: [true, "A tour must have a group maxGroupSize"],
        },
        difficulty: {
            type: String,
            required: [true, "A tour must have a difficulty"],
            enum: {
                values: ["easy", "medium", "difficult"],
                message: `{VALUE} is not supported as difficulty value`,
            },
        },
        ratingsAvarage: {
            type: Number,
            default: 4.5,
            min: [1, "Rating must be above 1.0"],
            max: [5, "Rating must be bellow 5.0"],
            set: (val) => Math.round(val * 10) / 10, // val=4.6666, val*10=46.666, func(46.666) = 47, 47/10 = 4.7
        },
        ratingsQuantity: {
            type: Number,
            default: 0,
            select: false,
            // So that you can permanently hide it from the output, useful for passwords etc.
        },
        price: {
            type: Number,
            required: [true, "A tour must have a price"],
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function (val) {
                    return val < this.price;
                },
                message: function (val) {
                    return `Discount (${val.value}) can not be greater than price aga`;
                },
            },
        },
        summary: {
            type: String,
            trim: true,
            required: [true, "A tour must create summary"],
        },
        description: {
            type: String,
            trim: true,
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
        },
        startDates: [Date],
        slug: String,
        secretTour: {
            type: Boolean,
            default: false,
        },
        startLocation: {
            // GeoJSON
            type: {
                type: String,
                default: "Point",
                enum: ["Point"],
            },
            coordinates: [Number],
            address: String,
            description: String,
        },
        locations: [
            {
                // GeoJSON
                type: {
                    type: String,
                    default: "Point",
                    enum: ["Point"],
                },
                coordinates: [Number],
                // We expact a list of numbers
                address: String,
                description: String,
                day: Number,
            },
        ],
        guides: [
            {
                type: mongoose.Schema.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        // When its outputted as json or object show virtuals too
    }
);

// We are sorting price index in ascending  order, indexes makes it much faster to mongodb engine to find
// Each index use resources so you should choose most used(querried) one te be indexed
tourSchema.index({ price: 1, ratingsAvarage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });

// VIRTUAL PROPERTY
tourSchema.virtual("durationWeeks").get(function () {
    return (this.duration / 7).toFixed(2);
});
// So durationWeeks not gonna be kept in the database but it is gonna be there when we call
// Can not use virtualProperty in query, because its not part of the DB

// VIRTUAL POPULATE
tourSchema.virtual("reviews", {
    ref: "Review",
    localField: "_id",
    foreignField: "tour",
});

//  MIDDLEWARES
// Document middleware: runs before .save() and .create()
tourSchema.pre("save", function (next) {
    // this keyword is gonna point currently processed document
    this.slug = slugify(this.name, { lower: true });
    next();
});

// Query Middleware
tourSchema.pre(/^find/, function (next) {
    // use for all functions starts with find, otherewise we cant cover findOne etc.
    // "this" keyword is now query object
    this.find({ secretTour: { $ne: true } });
    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: "guides review",
        select: "-__v -passwordChangedAt",
    });
    // auto populating
    next();
});

// 3) Aggregation Middleware
// taking off just to make geoNear aggregation first and so can work
// tourSchema.pre("aggregate", function (next) {
//     // console.log(this._pipeline);
//     this._pipeline.unshift({ $match: { secretTour: { $ne: true } } });
//     // console.log(this._pipeline);
//     next();
// });

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
