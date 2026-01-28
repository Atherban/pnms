const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ApiError = require("../exceptions/ApiError");

const UPLOADS_BASE_PATH = process.env.UPLOADS_BASE_PATH;
if (!UPLOADS_BASE_PATH) {
  throw new Error("UPLOADS_BASE_PATH not set");
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDirExists(UPLOADS_BASE_PATH);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_BASE_PATH);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new ApiError(400, "Only JPEG, PNG and WEBP images are allowed"),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});

module.exports = {upload};
