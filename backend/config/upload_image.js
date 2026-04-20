import multer from "multer";
import fs from "fs";
import path from "path";

// Dynamic storage (folder passed via middleware)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folder = req.uploadFolder || "others";

        const uploadPath = path.join("uploads", folder);

        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);

        const ext = path.extname(file.originalname);

        cb(null, `${uniqueSuffix}${ext}`);
    },
});

export const kycStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join("uploads", "kyc");

        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
        const uniqueName = `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

// File filter (image only)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Only JPG, PNG, WEBP allowed"), false);
    }

    cb(null, true);
};

// Base uploader
const baseUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

// Dynamic folder setter middleware
export const setUploadFolder = (folderName) => (req, res, next) => {
    req.uploadFolder = folderName;
    next();
};

// Export reusable upload handlers
export const uploadSingle = (fieldName) => baseUpload.single(fieldName);

export const uploadMultiple = (fieldName, maxCount = 5) =>
    baseUpload.array(fieldName, maxCount);

export const uploadKycDocuments = multer({
    storage: kycStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});