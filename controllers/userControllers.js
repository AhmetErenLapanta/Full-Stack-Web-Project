const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const multer = require("multer");
// const sharp = require("sharp");

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

// this way image will be stored as a buffer
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

exports.uploadUserPhoto = upload.single("photo");

// exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
//     // if no file then move on
//     if (!req.file) return next();

//     req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

//     await sharp(req.file.buffer)
//         .resize(500, 500)
//         .toFormat("jpeg")
//         .jpeg({ quality: 90 })
//         .toFile(`public/img/users/${req.file.filename}`);

//     next();
// });

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });

    return newObj;
};

exports.createUser = catchAsync(async (req, res, next) => {
    // const user = await User.create({
    //     name: req.body.name,
    //     email: req.body.email,
    //     password: req.body.password,
    //     passwordConfirm: req.body.passwordConfirm,
    // });
    // res.status(200).json({
    //     status: "success",
    //     data: { user },
    // });
    res.status(500).json({
        status: "error",
        message: "This route is not defined! Please use /signup instead",
    });
});

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                "This route is not for password updates. Please use /updateMyPassword.",
                400
            )
        );
    }
    // 2)filter the fields not allowed
    const filteredBody = filterObj(req.body, "name", "email");
    // saving image name to the database, by adding the photo property to the object that is going to be updated
    if (req.file) filteredBody.photo = req.file.filename;
    // 2)update user document
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        }
    );
    res.status(200).json({
        status: "success",
        data: {
            user: updatedUser,
        },
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndDelete(req.user.id, { active: false });

    res.status(204).json({
        status: "success",
        data: null,
    });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
// DON'T update password with this
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
