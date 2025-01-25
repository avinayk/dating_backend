const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const fluentFFmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Create an S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Store video temporarily on the local disk
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "./uploads/"); // Temporary folder to store the file
//   },
//   filename: (req, file, cb) => {
//     const fileName = `${Date.now().toString()}_${file.originalname}`;
//     cb(null, fileName);
//   },
// });

// Middleware to resize video if necessary
const resizeVideoIfNecessary = (req, res, next) => {
  const file = req.file;
  console.log(file.size);
  // Check if the file is a video and exceeds 10MB
  if (file.mimetype.startsWith("video") && file.size > 10 * 1024 * 1024) {
    const inputPath = file.path;
    const outputPath = path.join(__dirname, "resized_video.mp4");

    // Resize the video using ffmpeg
    fluentFFmpeg(inputPath)
      .output(outputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .size("1280x720") // Resize to 720p (or any other resolution you prefer)
      .on("end", () => {
        console.log("Video resized successfully");

        // Remove original large video from local disk
        fs.unlinkSync(inputPath);

        // Update file information with the resized video
        req.file.path = outputPath;

        next();
      })
      .on("error", (err) => {
        console.error("Error resizing video:", err);
        return res
          .status(500)
          .json({ message: "Error resizing video", error: err });
      })
      .run();
  } else {
    next(); // If video is small enough, continue without resizing
  }
};

// Set up multer storage to use S3
const uploadVideo = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
  fileFilter: (req, file, cb) => {
    // Accept any file type
    cb(null, true); // Accept file
  },
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const folder = req.body.fileType || "others"; // Use fileType from request
      const fileName = `${Date.now().toString()}_${file.originalname}`;
      cb(null, `${folder}/${fileName}`); // Upload to the folder based on fileType
    },
  }),
});

// Export all necessary middleware functions
module.exports = {
  uploadVideo,
  resizeVideoIfNecessary,
};
