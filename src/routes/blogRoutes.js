import express from 'express'
import { createBlog, deleteBlog, getAllBlogs, getBlogBySlug, updateBlog,  } from '../controllers/blog.controller.js';
const router = express.Router();
import upload from '../middleware/upload.js';


// Define blog routes
router.get('/api/blogs', getAllBlogs);
router.get('/api/blogs/:slug', getBlogBySlug);
router.post('/api/blogs', upload.single('file'), createBlog);
router.put('/api/blogs/:id', upload.single('file'), updateBlog);
router.delete('/api/blogs/:id', deleteBlog);

export default router;
