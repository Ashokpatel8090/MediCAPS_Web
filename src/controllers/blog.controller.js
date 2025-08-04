import db from '../config/db.js'
import cloudinary from '../utils/cloudinary.config.js'
import streamifier from 'streamifier';

/**
 * @swagger
 * /blogs:
 *   get:
 *     summary: Get all blogs
 *     tags: [Blogs]
 *     responses:
 *       200:
 *         description: List of blogs
 *       500:
 *         description: Server error
 */


export const getAllBlogs = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM blogs ORDER BY published_at DESC');

    if (results.length === 0) {
      return res.status(200).json({
        message: 'No blogs available at the moment.',
        blogs: [],
      });
    }

    res.status(200).json({ blogs: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



/**
 * @swagger
 * /blogs/{slug}:
 *   get:
 *     summary: Get a blog by its slug
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug of the blog (e.g., understanding-nutrition-what-your-body-really-needs)
 *     responses:
 *       200:
 *         description: Blog found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 slug:
 *                   type: string
 *                 content:
 *                   type: string
 *                 excerpt:
 *                   type: string
 *                 published_at:
 *                   type: string
 *                   format: date-time
 *                 featured_image_url:
 *                   type: string
 *                 featured_image_public_id:
 *                   type: string
 *                 meta_title:
 *                   type: string
 *                 meta_description:
 *                   type: string
 *                 views_count:
 *                   type: integer
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Blog not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Blog not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */


export const getBlogBySlug = (req, res) => {
  const { slug } = req.params;
  db.query('SELECT * FROM blogs WHERE slug = ?', [slug], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Blog not found' });
    res.json(results[0]);
  });
};

// @desc    Create new blog



/**
 * @swagger
 * /blogs:
 *   post:
 *     summary: Create a new blog post
 *     tags: [Blogs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: Medicaps Team IDC India Commends Government's Initiative
 *               slug:
 *                 type: string
 *                 example: medicaps-team-idc-india-commends-one-nation-one-test-policy
 *               content:
 *                 type: string
 *                 example: The full content of the blog...
 *               excerpt:
 *                 type: string
 *                 example: A short summary or intro of the blog...
 *               published_at:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-07-30T10:30:00Z
 *               featured_image_url:
 *                 type: string
 *                 example: https://example.com/image.jpg
 *               featured_image_public_id:
 *                 type: string
 *                 example: blog_images/abc123
 *               meta_title:
 *                 type: string
 *                 example: Government One Nation-One Test Policy Blog
 *               meta_description:
 *                 type: string
 *                 example: A blog praising India's health initiative policy...
 *     responses:
 *       201:
 *         description: Blog created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Blog created successfully
 *                 id:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid published_at format
 *       500:
 *         description: Server error or duplicate slug
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Duplicate entry 'slug' for key 'blogs.slug'
 */



const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'medicaps/blogs',
        resource_type: 'image',
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// @desc Create Blog
// controllers/blog.controller.js

export const createBlog = async (req, res) => {
  try {
    // Destructure fields from form body
    let {
      title,
      slug,
      content,
      excerpt,
      published_at,
      meta_title,
      meta_description,
    } = req.body;

    // Basic field validation
    if (!title || !slug || !content) {
      return res.status(400).json({
        error: "Title, slug, and content are required fields.",
      });
    }

    let featured_image_url = "";
    let featured_image_public_id = "";

    // Optional image upload
    if (req.file) {
      try {
        const result = await streamUpload(req.file.buffer); // Upload to Cloudinary
        featured_image_url = result.secure_url;
        featured_image_public_id = result.public_id;
      } catch (err) {
        console.error("Cloudinary upload failed:", err);
        return res.status(500).json({
          error: "Image upload failed",
          details: err.message,
        });
      }
    }

    // Conditionally include published_at
    const hasPublishedAt = published_at && published_at.trim() !== "";
    const query = `
      INSERT INTO blogs 
      (title, slug, content, excerpt, ${hasPublishedAt ? 'published_at, ' : ''}featured_image_url, featured_image_public_id, meta_title, meta_description)
      VALUES (?, ?, ?, ?, ${hasPublishedAt ? '?, ' : ''}?, ?, ?, ?)
    `;

    const values = [
      title,
      slug,
      content,
      excerpt,
      ...(hasPublishedAt
        ? [new Date(published_at).toISOString().slice(0, 19).replace("T", " ")]
        : []),
      featured_image_url,
      featured_image_public_id,
      meta_title || "",
      meta_description || "",
    ];

    const [result] = await db.query(query, values);

    return res.status(201).json({
      message: "✅ Blog created successfully",
      blog_id: result.insertId,
      featured_image_url,
    });
  } catch (err) {
    console.error("Unhandled Server Error:", err);
    return res.status(500).json({
      error: "Something went wrong on the server",
      details: err.message,
    });
  }
};







export const updateBlog = async (req, res) => {
  const { id } = req.params;

  const useValidValue = (newVal, oldVal) => {
    return newVal !== undefined && newVal !== null && newVal !== "" ? newVal : oldVal;
  };

  try {
    const [rows] = await db.query(`SELECT * FROM blogs WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Blog not found" });

    const existing = rows[0];

    let updatedBlog = {
      title: useValidValue(req.body.title, existing.title),
      slug: useValidValue(req.body.slug, existing.slug),
      content: useValidValue(req.body.content, existing.content),
      excerpt: useValidValue(req.body.excerpt, existing.excerpt),
      published_at: useValidValue(req.body.published_at, existing.published_at),
      featured_image_url: useValidValue(req.body.featured_image_url, existing.featured_image_url),
      featured_image_public_id: useValidValue(req.body.featured_image_public_id, existing.featured_image_public_id),
      meta_title: useValidValue(req.body.meta_title, existing.meta_title),
      meta_description: useValidValue(req.body.meta_description, existing.meta_description),
    };

    if (req.file) {
      try {
        const result = await streamUpload(req.file.buffer);
        updatedBlog.featured_image_url = result.secure_url;
        updatedBlog.featured_image_public_id = result.public_id;
      } catch (err) {
        return res.status(500).json({ error: "Image upload failed", details: err.message });
      }
    }

    if (req.body.published_at) {
      try {
        const dateObj = new Date(req.body.published_at);
        updatedBlog.published_at = dateObj.toISOString().slice(0, 19).replace("T", " ");
      } catch (err) {
        return res.status(400).json({ error: "Invalid published_at format" });
      }
    }

    const hasChanged = Object.entries(updatedBlog).some(
      ([key, value]) => value !== existing[key]
    );

    if (!hasChanged) {
      return res.status(400).json({ message: "No changes detected in blog content" });
    }

    const query = `
      UPDATE blogs SET 
        title = ?, slug = ?, content = ?, excerpt = ?, published_at = ?, 
        featured_image_url = ?, featured_image_public_id = ?, 
        meta_title = ?, meta_description = ?
      WHERE id = ?
    `;

    const values = [
      updatedBlog.title,
      updatedBlog.slug,
      updatedBlog.content,
      updatedBlog.excerpt,
      updatedBlog.published_at,
      updatedBlog.featured_image_url,
      updatedBlog.featured_image_public_id,
      updatedBlog.meta_title,
      updatedBlog.meta_description,
      id,
    ];

    await db.query(query, values);

    return res.json({ message: "Blog updated successfully" });
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};






export const deleteBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM blogs WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    return res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (err) {
    console.error('Delete Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


