import db from '../config/db.js'
import cloudinary from '../utils/cloudinary.config.js';
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
    // Fetch all blogs
    const [blogs] = await db.query(
      `SELECT * FROM blogs ORDER BY published_at DESC`
    );

    if (blogs.length === 0) {
      return res.status(200).json({
        message: "No blogs available at the moment.",
        blogs: [],
      });
    }

    // Get all images for these blogs
    const blogIds = blogs.map((b) => b.id);
    const [images] = await db.query(
      `SELECT * FROM blog_images WHERE blog_id IN (?) ORDER BY position ASC`,
      [blogIds]
    );

    // Group images by blog_id
    const imagesByBlog = images.reduce((acc, img) => {
      if (!acc[img.blog_id]) acc[img.blog_id] = [];
      acc[img.blog_id].push({
        id: img.id,
        url: img.image_url,
        public_id: img.image_public_id,
        position: img.position,
      });
      return acc;
    }, {});

    // Attach images to blogs
    const blogsWithImages = blogs.map((blog) => ({
      ...blog,
      images: imagesByBlog[blog.id] || [],
    }));

    res.status(200).json({ blogs: blogsWithImages });
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(500).json({ error: err.message });
  }
};



/**
 * @swagger
 * /blogs/{slug}:
 *   get:
 *     summary: Get a blog post by its slug
 *     tags:
 *       - Blogs
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: URL-friendly slug of the blog post
 *     responses:
 *       200:
 *         description: Blog post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 title:
 *                   type: string
 *                   example: "My Awesome Blog Post"
 *                 slug:
 *                   type: string
 *                   example: "my-awesome-blog-post"
 *                 content:
 *                   type: string
 *                   example: "<p>This is the blog content...</p>"
 *                 excerpt:
 *                   type: string
 *                   example: "Short summary or excerpt"
 *                 published_at:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-11 12:00:00"
 *                 featured_image_url:
 *                   type: string
 *                   example: "https://example.com/image.jpg"
 *                 featured_image_public_id:
 *                   type: string
 *                   example: "abc123"
 *                 meta_title:
 *                   type: string
 *                   example: "SEO Title"
 *                 meta_description:
 *                   type: string
 *                   example: "SEO description for the blog post"
 *       404:
 *         description: Blog not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Blog not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

export const getBlogBySlug = (req, res) => {
  const { slug } = req.params;
  db.query('SELECT * FROM blogs WHERE slug = ?', [slug], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Blog not found' });
    res.json(results[0]);
  });
};



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
      { folder: "medicaps/blogs" }, // 👈 adjust folder if needed
      // { folder: "testing" }, // 👈 adjust folder if needed

      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};



export const uploadImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No image provided" });
    }

    const result = await streamUpload(req.file.buffer);

    return res.status(200).json({
      message: "✅ Image uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error("Image upload error:", err);
    return res.status(500).json({
      error: "Image upload failed",
      details: err.message,
    });
  }
};



export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    const uploadResults = await Promise.all(
      req.files.map((file) => streamUpload(file.buffer))
    );

    return res.status(200).json({
      message: "✅ Images uploaded successfully",
      images: uploadResults.map((r) => ({
        url: r.secure_url,
        public_id: r.public_id,
      })),
    });
  } catch (err) {
    console.error("Multiple image upload error:", err);
    return res.status(500).json({
      error: "Multiple image upload failed",
      details: err.message,
    });
  }
};



export const deleteFeaturedImage = async (req, res) => {
  try {
    const { blogId } = req.params;

    const [rows] = await db.query(
      "SELECT featured_image_public_id FROM blogs WHERE id = ?",
      [blogId]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Blog not found" });

    const publicId = rows[0].featured_image_public_id;
    if (!publicId)
      return res.status(400).json({ error: "No featured image to delete" });

    await cloudinary.uploader.destroy(publicId);

    await db.query(
      "UPDATE blogs SET featured_image_url = NULL, featured_image_public_id = NULL WHERE id = ?",
      [blogId]
    );

    return res.json({ message: "✅ Featured image deleted successfully" });
  } catch (error) {
    console.error("Error deleting featured image:", error);
    return res.status(500).json({ error: "Server error" });
  }
};



export const deleteUploadedImages = async (req, res) => {
  try {
    const { publicIds } = req.body; // Expect array of Cloudinary public_ids

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return res.status(400).json({ error: "No public IDs provided" });
    }

    // 1. Delete from Cloudinary
    const deleteResults = await Promise.all(
      publicIds.map((id) => cloudinary.uploader.destroy(id))
    );

    deleteResults.forEach((r, i) => {
      if (r.result !== "ok" && r.result !== "not found") {
        console.warn(`⚠️ Failed to delete image ${publicIds[i]}`, r);
      }
    });

    // 2. Delete from DB if stored
    await db.query(
      "DELETE FROM blog_images WHERE image_public_id IN (?)",
      [publicIds]
    );

    return res.json({
      message: "✅ Uploaded images deleted successfully",
      deleted: publicIds.length,
    });
  } catch (err) {
    console.error("Delete uploaded images error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};



/**
 * @swagger
 * /blogs/create:
 *   post:
 *     summary: Create a new blog
 *     tags:
 *       - Blogs
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *         description: Title of the blog
 *       - in: formData
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: URL-friendly slug for the blog
 *       - in: formData
 *         name: content
 *         required: true
 *         schema:
 *           type: string
 *         description: Main content of the blog
 *       - in: formData
 *         name: excerpt
 *         schema:
 *           type: string
 *         description: Short summary or excerpt of the blog
 *       - in: formData
 *         name: published_at
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Optional published date/time (ISO format)
 *       - in: formData
 *         name: meta_title
 *         schema:
 *           type: string
 *         description: SEO meta title
 *       - in: formData
 *         name: meta_description
 *         schema:
 *           type: string
 *         description: SEO meta description
 *       - in: formData
 *         name: file
 *         type: file
 *         description: Optional featured image file upload
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
 *                   example: "✅ Blog created successfully"
 *                 blog_id:
 *                   type: integer
 *                   example: 123
 *                 featured_image_url:
 *                   type: string
 *                   example: "https://res.cloudinary.com/.../image.jpg"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Title, slug, and content are required fields."
 *       500:
 *         description: Server error or image upload failure
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Something went wrong on the server"
 *                 details:
 *                   type: string
 *                   example: "Detailed error message"
 */

// Create blog with multiple images
export const createBlog = async (req, res) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const {
      title,
      slug,
      content,
      excerpt,
      published_at,
      meta_title,
      meta_description,
      featured_image_url,
      featured_image_public_id,
    } = req.body;

    // ✅ images can come from req.body (already uploaded to Cloudinary)
    let images = [];
    if (req.body.images) {
      // If sent as JSON string
      images = typeof req.body.images === "string"
        ? JSON.parse(req.body.images)
        : req.body.images;
    }

    if (!title || !slug || !content) {
      return res.status(400).json({
        error: "Title, slug, and content are required fields.",
      });
    }

    const hasPublishedAt = published_at && published_at.trim() !== "";

    const blogQuery = `
      INSERT INTO blogs 
      (title, slug, content, excerpt, ${hasPublishedAt ? "published_at, " : ""}featured_image_url, featured_image_public_id, meta_title, meta_description)
      VALUES (?, ?, ?, ?, ${hasPublishedAt ? "?, " : ""}?, ?, ?, ?)
    `;

    const blogValues = [
      title,
      slug,
      content,
      excerpt || "",
      ...(hasPublishedAt
        ? [new Date(published_at).toISOString().slice(0, 19).replace("T", " ")]
        : []),
      featured_image_url || "",
      featured_image_public_id || "",
      meta_title || "",
      meta_description || "",
    ];

    const [result] = await connection.query(blogQuery, blogValues);
    const blogId = result.insertId;

    // ✅ Insert uploaded image URLs into blog_images table
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const { url, public_id } = images[i];
        await connection.query(
          `INSERT INTO blog_images (blog_id, image_url, image_public_id, position, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [blogId, url, public_id, i + 1]
        );
      }
    }

    await connection.commit();

    return res.status(201).json({
      message: "✅ Blog created successfully with images",
      blog_id: blogId,
      images,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Unhandled Server Error:", err);
    return res.status(500).json({
      error: "Something went wrong on the server",
      details: err.message,
    });
  } finally {
    connection.release();
  }
};



/**
 * @swagger
 * /blogs/update/{id}:
 *   put:
 *     summary: Update a blog by ID
 *     tags:
 *       - Blogs
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog to update
 *       - in: formData
 *         name: title
 *         schema:
 *           type: string
 *         description: New title of the blog
 *       - in: formData
 *         name: slug
 *         schema:
 *           type: string
 *         description: New slug for the blog
 *       - in: formData
 *         name: content
 *         schema:
 *           type: string
 *         description: Updated content of the blog
 *       - in: formData
 *         name: excerpt
 *         schema:
 *           type: string
 *         description: Updated excerpt/summary of the blog
 *       - in: formData
 *         name: published_at
 *         schema:
 *           type: string
 *           format: date-time
 *         description: New published date/time (ISO format)
 *       - in: formData
 *         name: featured_image_url
 *         schema:
 *           type: string
 *         description: URL of the featured image
 *       - in: formData
 *         name: featured_image_public_id
 *         schema:
 *           type: string
 *         description: Cloud storage public ID for the featured image
 *       - in: formData
 *         name: meta_title
 *         schema:
 *           type: string
 *         description: SEO meta title
 *       - in: formData
 *         name: meta_description
 *         schema:
 *           type: string
 *         description: SEO meta description
 *       - in: formData
 *         name: file
 *         type: file
 *         description: Optional featured image file upload
 *     responses:
 *       200:
 *         description: Blog updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Blog updated successfully
 *       400:
 *         description: No changes detected or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No changes detected in blog content
 *                 error:
 *                   type: string
 *                   example: Invalid published_at format
 *       404:
 *         description: Blog not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
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
 *                   example: Server error
 *                 details:
 *                   type: string
 *                   example: Detailed error message
 */

export const updateBlog = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const [rows] = await connection.query(`SELECT * FROM blogs WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }

    const existing = rows[0];
    let oldImagePublicId = null;
    let cloudinaryDeleteResult = null;

    // --- Update blog main fields ---
    const updatableFields = [
      "title",
      "slug",
      "content",
      "excerpt",
      "published_at",
      "meta_title",
      "meta_description",
      "featured_image_url",
      "featured_image_public_id",
    ];

    const fieldsToUpdate = [];
    const values = [];

    for (const field of updatableFields) {
      if (!req.body.hasOwnProperty(field)) continue;

      const value = req.body[field];

      if (field === "content" && (!value || value.trim() === "")) continue;

      if (field === "published_at") {
        const dateObj = new Date(value);
        fieldsToUpdate.push(`${field} = ?`);
        values.push(dateObj.toISOString().slice(0, 19).replace("T", " "));
      } else if (field === "featured_image_public_id" && value !== existing.featured_image_public_id) {
        oldImagePublicId = existing.featured_image_public_id;
        fieldsToUpdate.push(`${field} = ?`);
        values.push(value);
      } else {
        fieldsToUpdate.push(`${field} = ?`);
        values.push(value);
      }
    }

    if (fieldsToUpdate.length > 0) {
      const query = `UPDATE blogs SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;
      values.push(id);
      await connection.query(query, values);
    }

    // --- Handle multiple images ---
    let newImages = [];
    if (req.body.images) {
      newImages = typeof req.body.images === "string" ? JSON.parse(req.body.images) : req.body.images;

      // Optional: delete old images for this blog first (if replacing all)
      await connection.query(`DELETE FROM blog_images WHERE blog_id = ?`, [id]);

      for (let i = 0; i < newImages.length; i++) {
        const { url, public_id } = newImages[i];
        await connection.query(
          `INSERT INTO blog_images (blog_id, image_url, image_public_id, position, created_at) VALUES (?, ?, ?, ?, NOW())`,
          [id, url, public_id, i + 1]
        );
      }
    }

    // --- Delete old featured image from Cloudinary if replaced ---
    if (oldImagePublicId) {
      try {
        cloudinaryDeleteResult = await cloudinary.uploader.destroy(oldImagePublicId);
        console.log("🗑️ Old featured image deleted:", cloudinaryDeleteResult);
      } catch (err) {
        console.error("Failed to delete old featured image:", err.message);
      }
    }

    await connection.commit();

    return res.json({
      message: "✅ Blog updated successfully",
      updatedFields: fieldsToUpdate.map(f => f.split(" = ")[0]),
      deletedImage: oldImagePublicId || null,
      deleteResult: cloudinaryDeleteResult || null,
      newImages,
    });

  } catch (err) {
    await connection.rollback();
    console.error("Update Error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    connection.release();
  }
};





/**
 * @swagger
 * /blogs/delete/{id}:
 *   delete:
 *     summary: Delete a blog and its related data by ID
 *     tags:
 *       - Blogs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog to delete along with its comments, likes, and shares
 *     responses:
 *       200:
 *         description: Blog and related data deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Blog and related data deleted successfully
 *       404:
 *         description: Blog not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Blog not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */

export const deleteBlog = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Get the blog (featured image)
    const [blogs] = await connection.query(
      'SELECT featured_image_public_id FROM blogs WHERE id = ?',
      [id]
    );

    if (blogs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Blog not found' });
    }

    const blog = blogs[0];

    // 2️⃣ Get all additional blog images
    const [blogImages] = await connection.query(
      'SELECT image_public_id FROM blog_images WHERE blog_id = ?',
      [id]
    );

    // 3️⃣ Delete Cloudinary featured image
    if (blog.featured_image_public_id) {
      try {
        await cloudinary.uploader.destroy(blog.featured_image_public_id);
      } catch (cloudErr) {
        console.error('Cloudinary delete error (featured):', cloudErr);
      }
    }

    // 4️⃣ Delete Cloudinary blog images
    for (const img of blogImages) {
      if (img.image_public_id) {
        try {
          await cloudinary.uploader.destroy(img.image_public_id);
        } catch (cloudErr) {
          console.error('Cloudinary delete error (blog_images):', cloudErr);
        }
      }
    }

    // 5️⃣ Delete related tables first
    await connection.query('DELETE FROM blog_comments WHERE blog_id = ?', [id]);
    await connection.query('DELETE FROM blog_likes WHERE blog_id = ?', [id]);
    await connection.query('DELETE FROM blog_shares WHERE blog_id = ?', [id]);
    await connection.query('DELETE FROM blog_images WHERE blog_id = ?', [id]);

    // 6️⃣ Delete the blog itself
    const [result] = await connection.query('DELETE FROM blogs WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Blog not found' });
    }

    await connection.commit();
    return res.status(200).json({
      message: '✅ Blog, related data, and images deleted successfully'
    });

  } catch (err) {
    await connection.rollback();
    console.error('Delete Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};






/**
 * @swagger
 * /blogs/{blogId}/like:
 *   post:
 *     summary: Like or unlike a specific blog post (toggle)
 *     tags:
 *       - Blogs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blogId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog to like or unlike
 *     responses:
 *       200:
 *         description: Blog liked or unliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Blog liked successfully
 *                 likes_count:
 *                   type: integer
 *                   example: 5
 *                 liked:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid blog ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid blog ID
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
 *                 message:
 *                   type: string
 *                   example: Server error
 *                 details:
 *                   type: string
 *                   example: Detailed error message
 */
export const likeBlog = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { blogId } = req.params;

    if (!blogId || isNaN(blogId)) {
      return res.status(400).json({ message: "Invalid blog ID" });
    }

    // Check blog existence
    const [blogRows] = await db.query("SELECT * FROM blogs WHERE id = ?", [blogId]);
    if (blogRows.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Check if user already liked the blog
    const [likeRows] = await db.query(
      "SELECT * FROM blog_likes WHERE user_id = ? AND blog_id = ?",
      [userId, blogId]
    );

    let message, liked;

    if (likeRows.length > 0) {
      // Dislike (remove like)
      await db.query("DELETE FROM blog_likes WHERE user_id = ? AND blog_id = ?", [userId, blogId]);
      message = "Blog unliked successfully";
      liked = false;
    } else {
      // Like (add like)
      await db.query("INSERT INTO blog_likes (user_id, blog_id) VALUES (?, ?)", [userId, blogId]);
      message = "Blog liked successfully";
      liked = true;
    }

    // Recalculate total likes from blog_likes table
    const [likesCountRows] = await db.query(
      "SELECT COUNT(*) as total_likes FROM blog_likes WHERE blog_id = ?",
      [blogId]
    );
    const likes_count = likesCountRows[0]?.total_likes || 0;

    // Update the blogs.likes_count column to keep it in sync
    await db.query("UPDATE blogs SET likes_count = ? WHERE id = ?", [likes_count, blogId]);

    return res.status(200).json({
      message,
      likes_count,
      liked,
    });
  } catch (err) {
    console.error("Error toggling like:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};



// Fetch total likes for a blog
/**
 * @swagger
 * /blogs/{blogId}/likes:
 *   get:
 *     summary: Get total likes and user like status for a specific blog
 *     tags:
 *       - Blogs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blogId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog to get like information for
 *     responses:
 *       200:
 *         description: Likes count and user like status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blogId:
 *                   type: integer
 *                   example: 87
 *                 likes_count:
 *                   type: integer
 *                   example: 10
 *                 user_liked:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid blog ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid blog ID
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
 *                 message:
 *                   type: string
 *                   example: Server error
 *                 details:
 *                   type: string
 *                   example: Detailed error message
 */
export const getBlogLikes = async (req, res) => {
  try {
    const { blogId } = req.params;

    if (!blogId || isNaN(blogId)) {
      return res.status(400).json({ message: "Invalid blog ID" });
    }

    // Extract user ID from JWT (assuming `req.user.sub` is set by auth middleware)
    const userId = req.user?.sub;

    // Check if the blog exists
    const [blogRows] = await db.query("SELECT id FROM blogs WHERE id = ?", [blogId]);
    if (blogRows.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Get total likes
    const [likesCountRows] = await db.query(
      "SELECT COUNT(*) as total_likes FROM blog_likes WHERE blog_id = ?",
      [blogId]
    );

    // Check if current user liked it
    let userLiked = false;
    if (userId) {
      const [userLikeRows] = await db.query(
        "SELECT 1 FROM blog_likes WHERE blog_id = ? AND user_id = ? LIMIT 1",
        [blogId, userId]
      );
      userLiked = userLikeRows.length > 0;
    }

    return res.status(200).json({
      blogId,
      likes_count: likesCountRows[0]?.total_likes || 0,
      user_liked: userLiked
    });

  } catch (err) {
    console.error("Error fetching total likes:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};




// Add a comment to a blog
/**
 * @swagger
 * /blogs/{blogId}/comments:
 *   post:
 *     summary: Add a comment to a specific blog post
 *     tags:
 *       - Blogs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blogId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog to add a comment to
 *     requestBody:
 *       description: Comment content
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 example: This is a very insightful post!
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment added successfully
 *                 comment_id:
 *                   type: integer
 *                   example: 42
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-11 14:30:00"
 *       400:
 *         description: Comment cannot be empty
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment cannot be empty
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
 *                 message:
 *                   type: string
 *                   example: Server error
 *                 details:
 *                   type: string
 *                   example: Detailed error message
 */
export const addComment = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { blogId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim() === "") {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    // Validate blog existence
    const [blogRows] = await db.query("SELECT id FROM blogs WHERE id = ?", [blogId]);
    if (blogRows.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Get current time in IST
    const createdAt = getCurrentISTDateTime();

    // Insert comment with created_at
    const [result] = await db.query(
      "INSERT INTO blog_comments (blog_id, user_id, comment, created_at) VALUES (?, ?, ?, ?)",
      [blogId, userId, comment, createdAt]
    );

    return res.status(201).json({
      message: "Comment added successfully",
      comment_id: result.insertId,
      created_at: createdAt,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};




// Helper function to get IST time formatted for MySQL
function getCurrentISTDateTime() {
  const date = new Date();

  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60000;
  const istTime = new Date(utc + istOffset);

  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const day = String(istTime.getDate()).padStart(2, '0');
  const hours = String(istTime.getHours()).padStart(2, '0');
  const minutes = String(istTime.getMinutes()).padStart(2, '0');
  const seconds = String(istTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}




/**
 * @swagger
 * /blogs/{blogId}/comments:
 *   get:
 *     summary: Get comments for a specific blog post
 *     tags:
 *       - Blogs
 *     parameters:
 *       - in: path
 *         name: blogId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog to fetch comments for
 *     responses:
 *       200:
 *         description: List of comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalComments:
 *                   type: integer
 *                   example: 5
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 10
 *                       comment:
 *                         type: string
 *                         example: This is a great blog!
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-08-11T08:30:00Z"
 *                       user_id:
 *                         type: integer
 *                         example: 3
 *                       user_name:
 *                         type: string
 *                         example: "Ashok Patel"
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
 *                 message:
 *                   type: string
 *                   example: Server error
 *                 details:
 *                   type: string
 *                   example: Detailed error message
 */
export const getComments = async (req, res) => {
  try {
    const { blogId } = req.params;

    // Validate blog existence
    const [blogRows] = await db.query("SELECT id FROM blogs WHERE id = ?", [blogId]);
    if (blogRows.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Fetch comments with user info
    const [comments] = await db.query(
      `SELECT c.id, c.comment, c.created_at, u.id as user_id, u.full_name as user_name
       FROM blog_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.blog_id = ?
       ORDER BY c.created_at DESC`,
      [blogId]
    );

    return res.status(200).json({
      totalComments: comments.length,
      comments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};




/**
 * @swagger
 * /blogs/{blogId}/share:
 *   post:
 *     summary: Share a blog post on a specific platform
 *     tags:
 *       - Blogs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blogId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog to share
 *     requestBody:
 *       description: Platform on which the blog is shared
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *             properties:
 *               platform:
 *                 type: string
 *                 example: facebook
 *     responses:
 *       201:
 *         description: Blog shared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Blog shared successfully on facebook
 *                 share_id:
 *                   type: integer
 *                   example: 123
 *                 total_shares:
 *                   type: integer
 *                   example: 15
 *       400:
 *         description: Platform is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Platform is required
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
 *                 message:
 *                   type: string
 *                   example: Server error
 *                 details:
 *                   type: string
 *                   example: Detailed error message
 */
export const shareBlog = async (req, res) => {
  console.log('req.user:', req.user);
  try {
    const userId = req.user.sub; // from JWT
    console.log(userId);
    
    const { slug } = req.params; // get slug from params instead of blogId
    const { platform } = req.body;

    if (!platform || platform.trim() === "") {
      return res.status(400).json({ message: "Platform is required" });
    }

    // Find blog by slug
    const [blogRows] = await db.query("SELECT id FROM blogs WHERE slug = ?", [slug]);
    if (blogRows.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const blogId = blogRows[0].id;

    // Insert into blog_shares
    const [result] = await db.query(
      "INSERT INTO blog_shares (blog_id, user_id, platform) VALUES (?, ?, ?)",
      [blogId, userId, platform]
    );

    // Get total share count
    const [countRows] = await db.query(
      "SELECT COUNT(*) AS totalShares FROM blog_shares WHERE blog_id = ?",
      [blogId]
    );

    return res.status(201).json({
      message: `Blog shared successfully on ${platform}`,
      share_id: result.insertId,
      total_shares: countRows[0].totalShares,
    });
  } catch (error) {
    console.error("Error sharing blog:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};




/**
 * @swagger
 * /blogs/{blogId}/share-count:
 *   get:
 *     summary: Get total share count for a blog
 *     tags:
 *       - Blogs
 *     parameters:
 *       - in: path
 *         name: blogId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the blog to get share count for
 *     responses:
 *       200:
 *         description: Total share count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blog_id:
 *                   type: integer
 *                   example: 87
 *                 total_shares:
 *                   type: integer
 *                   example: 15
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
 *                 message:
 *                   type: string
 *                   example: Server error
 *                 details:
 *                   type: string
 *                   example: Detailed error message
 */

export const getBlogShareCount = async (req, res) => {
  try {
    const { slug } = req.params;

    // Check blog existence by slug
    const [blogRows] = await db.query("SELECT id FROM blogs WHERE slug = ?", [slug]);
    if (blogRows.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const blogId = blogRows[0].id;

    // Fetch total share count
    const [countRows] = await db.query(
      "SELECT COUNT(*) AS totalShares FROM blog_shares WHERE blog_id = ?",
      [blogId]
    );

    return res.status(200).json({
      blog_id: blogId,
      slug: slug,
      total_shares: countRows[0].totalShares,
    });
  } catch (error) {
    console.error("Error fetching share count:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};



/**
 * @swagger
 * /blogs/{id}:
 *   get:
 *     summary: Get a blog by its ID
 *     tags:
 *       - Blogs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the blog to fetch
 *     responses:
 *       200:
 *         description: Blog fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 123
 *                 title:
 *                   type: string
 *                   example: "My First Blog"
 *                 slug:
 *                   type: string
 *                   example: "my-first-blog"
 *                 content:
 *                   type: string
 *                   example: "<p>This is the blog content</p>"
 *                 excerpt:
 *                   type: string
 *                   example: "This is a short summary..."
 *                 published_at:
 *                   type: string
 *                   example: "2025-08-23 15:30:00"
 *                 featured_image_url:
 *                   type: string
 *                   example: "https://res.cloudinary.com/.../blog.jpg"
 *                 featured_image_public_id:
 *                   type: string
 *                   example: "blogs/blog123"
 *                 meta_title:
 *                   type: string
 *                   example: "My First Blog Meta Title"
 *                 meta_description:
 *                   type: string
 *                   example: "Meta description of my first blog"
 *       400:
 *         description: Blog ID is missing in the request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Blog ID is required in the URL"
 *       404:
 *         description: Blog not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Blog not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Server error"
 *                 details:
 *                   type: string
 *                   example: "Detailed error message"
 */

// GET blog by ID
export const getBlogById = async (req, res) => {
  const { id } = req.params; // fetch ID from URL params

  if (!id) {
    return res.status(400).json({ error: "Blog ID is required in the URL" });
  }

  const connection = await db.getConnection();

  try {
    // Fetch blog main data
    const [blogs] = await connection.query(`SELECT * FROM blogs WHERE id = ?`, [id]);
    if (blogs.length === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }
    const blog = blogs[0];

    // Fetch all images for this blog
    const [images] = await connection.query(
      `SELECT id, image_url AS url, image_public_id AS public_id, position 
       FROM blog_images 
       WHERE blog_id = ? 
       ORDER BY position ASC`,
      [id]
    );

    // Return blog data with images array
    return res.json({
      ...blog,
      images, // array of { url, public_id, position }
    });
  } catch (err) {
    console.error("Fetch Blog Error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    connection.release();
  }
};




