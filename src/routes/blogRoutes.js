import express from "express";
import {
  addComment,
  createBlog,
  deleteBlog,
  deleteImage,
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
} from "../controllers/blog.controller.js";

import upload from "../middleware/upload.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Always put the most specific routes BEFORE the generic `:slug` route

// Blog sharing routes
router.post("/api/blog/:slug/share", verifyToken, shareBlog);
router.get("/api/blog/:slug/share-count", getBlogShareCount);

router.get('/api/blogs', getAllBlogs);
router.get('/api/blogs/search/:slug', getBlogBySlug);
// POST instead of GET to pass ID in body
router.get('/api/blogs/:id', getBlogById);


router.post("/api/blogs/create", upload.single("file"), createBlog);

router.patch('/api/blogs/update/:id', upload.single('file'), updateBlog);

router.delete('/api/blogs/delete/:id', deleteBlog);

router.post("/api/blogs/:blogId/like", verifyToken, likeBlog);
router.get("/api/blogs/:blogId/likes", verifyToken, getBlogLikes);

router.post("/api/blogs/:blogId/comments", verifyToken, addComment);
router.get("/api/blogs/:blogId/comments", getComments);

// router.post("/api/images/upload", upload.single("file"), uploadImage);
router.post("/api/images/upload", upload.array("images", 10), uploadImage);
router.delete("/api/images/delete", deleteImage);


export default router;
