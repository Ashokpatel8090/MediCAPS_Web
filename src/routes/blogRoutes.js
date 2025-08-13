import express from "express";
import {
  addComment,
  createBlog,
  deleteBlog,
  getAllBlogs,
  getBlogBySlug,
  getBlogLikes,
  getBlogShareCount,
  getComments,
  likeBlog,
  shareBlog,
  updateBlog,
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

router.post("/api/blogs/create", upload.single("file"), createBlog);

router.put('/api/blogs/update/:id', upload.single('file'), updateBlog);

router.delete('/api/blogs/delete/:id', deleteBlog);

router.post("/api/blogs/:blogId/like", verifyToken, likeBlog);
router.get("/api/blogs/:blogId/likes", verifyToken, getBlogLikes);

router.post("/api/blogs/:blogId/comments", verifyToken, addComment);
router.get("/api/blogs/:blogId/comments", getComments);

export default router;
