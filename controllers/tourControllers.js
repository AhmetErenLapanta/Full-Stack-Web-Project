const Tour = require("./../models/tourModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const AppError = require("../utils/appError");
const multer = require("multer");
// const sharp = require("sharp");

const multerStorage = multer.memoryStorage();

// testing if the uploaded file is image
const multerFilter = (req, file, cb) => {
    // mimtype: "image/jpeg"
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        // cb is like next() funtion in express
        cb(
            new AppError("Not an image! Please upload only images.", 400),
            false
        );
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
    { name: "imageCover", maxCount: 1 },
    { name: "images", maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next();

    // 1) Cover image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`);

    // 2) Images
    req.body.images = [];

    // to await all promises in array
    await Promise.all(
        // not foreEach but map, so that we store the promises in an array
        req.files.images.map(async (file, i) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${
                i + 1
            }.jpeg`;

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat("jpeg")
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${filename}`);

            req.body.images.push(filename);
        })
    );

    // we move on to the next middleware as soon as Promises are completed
    // otherwise req.body.images will be empty so our file names not gonna be saved to the current tour document
    next();
});

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = "5";
    req.query.sort = "-ratingsAvarage,price";
    req.query.fields = "name,price,ratingsAvarage,summary,difficulty";
    next();
};

exports.checkBody = (req, res, next) => {
    if (!req.body.name || !req.body.price) {
        return res.status(404).json({
            status: "fail",
            message: "Missing name or price",
        });
    }
    next();
};

// get all the tours
exports.getAllTours = factory.getAll(Tour);

// get one particular tour
exports.getTour = factory.getOne(Tour, { path: "reviews" });
// create a tour
exports.createTour = factory.createOne(Tour);
// to update tour
exports.updateTour = factory.updateOne(Tour);
// to delete tour
exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//     const tour = await Tour.findByIdAndDelete(req.params.id);

//     if (!tour) {
//         return next(
//             new appError(`No tour found with id: ${req.params.id}`, 404)
//         );
//     }

//     res.status(204).json({
//         status: "success",
//         data: null,
//     });
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: {
                ratingsAvarage: { $gte: 4.5 },
                // secretTour: { $ne: true },
            },
        },
        {
            $group: {
                _id: { $toUpper: "$difficulty" },
                // _id: "$maxGroupSize", Grouped them by the difficulty
                numTours: { $sum: 1 },
                // add 1 for each document
                numRatings: { $sum: "$ratingsQuantity" },
                avgRating: { $avg: "$ratingsAverage" },
                avgPrice: { $avg: "$price" },
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
            },
        },
        {
            $sort: { avgPrice: 1 },
            // 1 means ascending, -1 means descending order
        },
    ]);

    res.status(200).json({
        status: "success",
        data: {
            stats,
        },
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;

    const plan = await Tour.aggregate([
        {
            $unwind: "$startDates",
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                },
            },
        },
        {
            $group: {
                _id: { $month: "$startDates" },
                numTourStarts: { $sum: 1 },
                tours: { $push: "$name" },
            },
        },
        {
            $addFields: { months: "$_id" },
        },
        {
            $project: {
                _id: 0,
            },
        },
        {
            $sort: {
                numTourStarts: -1,
            },
        },
        {
            $limit: 3,
        },
    ]);

    res.status(200).json({
        status: "success",
        data: {
            plan,
        },
    });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// 39.653701697078176, 27.875176864808147
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(",");
    const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;
    if (!lat || !lng) {
        next(new AppError("Please provide a latitude and longtitude", 400));
    }

    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
        // we need to add an index to the startLocation in order to de Geospatial queries
    });

    res.status(200).json({
        status: "success",
        results: tours.length,
        data: {
            data: tours,
        },
    });
});

// "/distances/:latlng/unit/:unit"
exports.getDistances = async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(",");
    // const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;
    if (!lat || !lng) {
        next(new AppError("Please provide a latitude and longtitude", 400));
    }

    const multiplier = unit === "mi" ? 0.000621371 : 0.001;

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [lng * 1, lat * 1],
                },
                distanceField: "distance",
                distanceMultiplier: multiplier,
            },
        },
        {
            $project: {
                distance: 1,
                name: 1,
            },
        },
    ]);

    res.status(200).json({
        status: "success",
        data: {
            data: distances,
        },
    });
};
