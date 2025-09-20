import multer from "multer";

// Memory storage (keeps files in RAM instead of disk)
const storage = multer.memoryStorage();

// File filter (only allow images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /image\/(jpeg|jpg|png|webp)/;
  const isValid = allowedTypes.test(file.mimetype);

  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("❌ Invalid file type. Only JPG, PNG, WEBP allowed."));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter,
});

export default upload;
