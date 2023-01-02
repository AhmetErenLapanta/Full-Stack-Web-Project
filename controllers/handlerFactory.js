const catchAsync = require("../utils/catchAsync");
const appError = require("../utils/appError");
const APIFeatures = require("./../utils/apiFeatures");

exports.deleteOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndDelete(req.params.id);

        if (!doc) {
            return next(
                new appError(`No doc found with id: ${req.params.id}`, 404)
            );
        }

        res.status(204).json({
            status: "success",
            data: null,
        });
    });

exports.updateOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            // new updated document gonna be the one returned, default is false
            runValidators: true,
        });

        if (!doc) {
            return next(
                new appError(`No doc found with id: ${req.params.id}`, 404)
            );
        }

        res.status(200).json({
            status: "success",
            data: {
                doc,
            },
        });
    });

exports.createOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const newDoc = await Model.create(req.body);
        res.status(201).json({
            status: "success",
            data: {
                doc: newDoc,
            },
        });
    });

exports.getOne = (Model, popOptions) =>
    catchAsync(async (req, res, next) => {
        let query = Model.findOne({ _id: req.params.id });
        if (popOptions) query = query.populate(popOptions);
        const doc = await query;

        if (!doc) {
            return next(
                new appError(`No doc found with id: ${req.params.id}`, 404)
            );
        }
        // when next() receives something it assumes this is an error and send it to the global error handler
        res.status(200).json({
            status: "success",
            data: {
                doc,
            },
        });
    });

exports.getAll = (Model) =>
    catchAsync(async (req, res, next) => {
        // allowing nested routes for Tours
        let filter = {};
        if (req.params.tourId) filter = { tour: req.params.tourId };

        const features = new APIFeatures(
            Model.find(filter).populate("guides"),
            req.query
        )
            .filter()
            .sort()
            .limitFields()
            .paginate();
        // this chaning works because we added return this at the end of the each

        // const doc = await features.query.explain();
        const doc = await features.query;

        // SEND RESPONSE
        res.status(200).json({
            status: "success",
            requestedAt: req.requestTime,
            results: doc.length,
            data: {
                doc,
            },
        });
    });
