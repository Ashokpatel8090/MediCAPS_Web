import express from 'express'
import { createBlog, deleteBlog, getAllBlogs, getBlogBySlug, updateBlog } from '../controllers/blog.controller.js';
const router = express.Router();


// Define blog routes
router.get('/api/blogs', getAllBlogs);
router.get('/api/blogs/:slug', getBlogBySlug);
router.post('/api/blogs', createBlog);
router.put('/api/blogs/:id', updateBlog);
router.delete('/api/blogs/:id', deleteBlog);

export default router;
