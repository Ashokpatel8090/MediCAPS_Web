import express from "express";
import {
  addComment,
  createBlog,
  // deleteUploadedImages,
  deleteFeaturedImage,
  deleteMultipleImages,
  getAllBlogs,
  getBlogById,
  getBlogBySlug,
  getBlogLikes,
  getBlogShareCount,
  getComments,
  likeBlog,
  shareBlog,
  updateBlog,
  uploadImage,
  uploadMultipleImages,
  // deleteMultipleBlogImages,
} from "../controllers/blog.controller.js";

import upload from "../middleware/upload.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Blog sharing routes
router.post("/api/blog/:slug/share", verifyToken, shareBlog);
router.get("/api/blog/:slug/share-count", getBlogShareCount);

router.get('/api/blogs', getAllBlogs);
router.get('/api/blogs/search/:slug', getBlogBySlug);
router.get('/api/blogs/:id', getBlogById);


router.post("/api/blogs/create", upload.array("images", 10), createBlog);

router.patch('/api/blogs/update/:id', upload.single('file'), updateBlog);


router.post("/api/blogs/:blogId/like", verifyToken, likeBlog);
router.get("/api/blogs/:blogId/likes", verifyToken, getBlogLikes);

router.post("/api/blogs/:blogId/comments", verifyToken, addComment);
router.get("/api/blogs/:blogId/comments", getComments);



router.post("/api/images/upload", upload.single("file"), uploadImage);
router.delete("/api/images/upload", deleteFeaturedImage);
router.post("/api/images/upload-multiple", upload.array("file"), uploadMultipleImages);
router.delete("/api/images/delete-multiple", deleteMultipleImages);




// router.post("/api/images/upload", upload.single("file"), uploadImage);
// router.post("/api/images/upload-multiple", upload.array("files", 10), uploadMultipleImages);



// router.delete("/api/blogs/:blogId/featured-image", deleteFeaturedImage);
// router.delete("/api/blogs/:blogId/featured-image", deleteMultipleBlogImages);
// router.delete("/api/blogs/:blogId/images", deleteUploadedImages);


export default router;
