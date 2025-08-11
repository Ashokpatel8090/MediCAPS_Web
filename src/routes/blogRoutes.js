import express from 'express'
import { addComment, createBlog, deleteBlog, getAllBlogs, getBlogBySlug, getBlogLikes, getBlogShareCount, getComments, likeBlog, shareBlog, updateBlog,  } from '../controllers/blog.controller.js';
const router = express.Router();
import upload from '../middleware/upload.js';
import { verifyToken } from '../middleware/authMiddleware.js';


// Define blog routes
router.get('/api/blogs', getAllBlogs);
router.get('/api/blogs/search/:slug', getBlogBySlug);

router.post('/api/blogs/create', upload.single('file'), createBlog);
router.put('/api/blogs/update/:id', upload.single('file'), updateBlog);

router.delete('/api/blogs/delete/:id', deleteBlog);

router.post("/api/blogs/:blogId/like", verifyToken, likeBlog);
router.get("/api/blogs/:blogId/likes", verifyToken, getBlogLikes);

router.post("/api/blogs/:blogId/comments", verifyToken, addComment);
router.get("/api/blogs/:blogId/comments", getComments);

router.post("/api/blogs/:blogId/share", verifyToken, shareBlog);
// routes/blog.routes.js
router.get("/api/blogs/:blogId/share-count", getBlogShareCount);



export default router;
