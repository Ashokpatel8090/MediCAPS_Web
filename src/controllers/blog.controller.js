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

export const getBlogBySlug = async (req, res) => {
  const { slug } = req.params;

  try {
    // 1️⃣ Fetch main blog details
    const [blogs] = await db.query(
      `SELECT 
         b.id, b.title, TRIM(b.slug) as slug, b.content, b.excerpt, 
         b.featured_image_url, b.featured_image_public_id, 
         b.meta_title, b.meta_description, 
         b.views_count, b.likes_count, 
         b.created_at, b.updated_at, b.published_at
       FROM blogs b
       WHERE TRIM(b.slug) = ?`,
      [slug.trim()]
    );

    if (blogs.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const blog = blogs[0];

    // 2️⃣ Fetch blog images
    const [images] = await db.query(
      `SELECT id, image_url as url, image_public_id as public_id, position, created_at
       FROM blog_images
       WHERE blog_id = ?
       ORDER BY position ASC`,
      [blog.id]
    );

    // 3️⃣ Fetch comments
    const [comments] = await db.query(
      `SELECT id, user_id, comment, created_at
       FROM blog_comments
       WHERE blog_id = ?
       ORDER BY created_at DESC`,
      [blog.id]
    );

    // 4️⃣ Fetch likes count (in case likes_count is outdated)
    const [likes] = await db.query(
      `SELECT COUNT(*) as totalLikes
       FROM blog_likes
       WHERE blog_id = ?`,
      [blog.id]
    );

    // 5️⃣ Fetch shares count
    const [shares] = await db.query(
      `SELECT COUNT(*) as totalShares
       FROM blog_shares
       WHERE blog_id = ?`,
      [blog.id]
    );

    // 6️⃣ Build final response object
    const blogResponse = {
      ...blog,
      images,
      comments,
      likes_count: likes[0].totalLikes,
      shares_count: shares[0].totalShares,
    };

    res.json(blogResponse);
  } catch (err) {
    console.error("Error fetching blog by slug:", err);
    res.status(500).json({ error: err.message });
  }
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


/**
 * @swagger
 * /images/upload:
 *   post:
 *     summary: Upload a single image to Cloudinary
 *     description: This endpoint uploads a single image file to Cloudinary and returns its public URL and public ID. The image is sent as a multipart/form-data request.
 *     tags:
 *       - Blog Images
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "✅ Image uploaded successfully"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   example: "https://res.cloudinary.com/demo/image/upload/v1699999999/sample.jpg"
 *                 public_id:
 *                   type: string
 *                   example: "sample_public_id"
 *       400:
 *         description: Bad request — missing image file in request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No image provided"
 *       500:
 *         description: Server error while uploading image
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Image upload failed"
 *                 details:
 *                   type: string
 *                   example: "Cloudinary upload error: invalid signature"
 */

export const uploadImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Upload to Cloudinary
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

/**
 * @swagger
 * /images/upload-multiple:
 *   post:
 *     summary: Upload multiple images to Cloudinary
 *     description: This endpoint uploads multiple image files (up to 10) to Cloudinary and returns their URLs and public IDs.
 *     tags:
 *       - Blog Images
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: List of image files to upload (max 10)
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "✅ Images uploaded successfully"
 *                 images:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                         format: uri
 *                         example: "https://res.cloudinary.com/demo/image/upload/v1699999999/sample1.jpg"
 *                       public_id:
 *                         type: string
 *                         example: "sample_public_id_1"
 *       400:
 *         description: Bad request — no images provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No images provided"
 *       500:
 *         description: Server error while uploading images
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Images upload failed"
 *                 details:
 *                   type: string
 *                   example: "Cloudinary upload error: invalid file format"
 */

export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    const uploaded = [];
    for (const file of req.files) {
      const result = await streamUpload(file.buffer);
      uploaded.push({ url: result.secure_url, public_id: result.public_id });
    }

    return res.status(200).json({
      message: "✅ Images uploaded successfully",
      images: uploaded,
    });
  } catch (err) {
    console.error("Multiple image upload error:", err);
    return res.status(500).json({
      error: "Images upload failed",
      details: err.message,
    });
  }
};


/**
 * @swagger
 * /images/delete-multiple:
 *   delete:
 *     summary: Delete all images associated with a specific blog
 *     description: This endpoint deletes all images for a given `blog_id` — first from Cloudinary, then from the database (`blog_images` table).
 *     tags:
 *       - Blog Images
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blog_id:
 *                 type: integer
 *                 description: The ID of the blog whose images should be deleted
 *                 example: 42
 *     responses:
 *       200:
 *         description: All blog images deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "✅ All images deleted successfully"
 *                 blog_id:
 *                   type: integer
 *                   example: 42
 *                 deleted_count:
 *                   type: integer
 *                   example: 5
 *       400:
 *         description: Missing required blog_id in request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "blog_id is required"
 *       404:
 *         description: No images found for the provided blog ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No images found for this blog"
 *       500:
 *         description: Server error during deletion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to delete images"
 *                 details:
 *                   type: string
 *                   example: "Database connection lost"
 */

export const deleteMultipleImages = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { blog_id } = req.body;
    if (!blog_id) {
      return res.status(400).json({ error: "blog_id is required" });
    }

    // 1️⃣ Fetch all images for the blog using correct column name
    const [images] = await connection.query(
      `SELECT id, image_public_id FROM blog_images WHERE blog_id = ?`,
      [blog_id]
    );

    if (images.length === 0) {
      return res.status(404).json({ message: "No images found for this blog" });
    }

    // 2️⃣ Delete images from Cloudinary
    for (const img of images) {
      try {
        await cloudinary.uploader.destroy(img.image_public_id);
      } catch (err) {
        console.warn(`Failed to delete Cloudinary image ${img.image_public_id}:`, err.message);
      }
    }

    // 3️⃣ Delete images from the database
    await connection.query(`DELETE FROM blog_images WHERE blog_id = ?`, [blog_id]);

    return res.status(200).json({
      message: "✅ All images deleted successfully",
      blog_id,
      deleted_count: images.length,
    });
  } catch (err) {
    console.error("Multiple image delete error:", err);
    return res.status(500).json({
      error: "Failed to delete images",
      details: err.message,
    });
  } finally {
    connection.release();
  }
};


/**
 * @swagger
 * /images/{blog_id}/featured-image:
 *   delete:
 *     summary: Delete the featured image of a blog
 *     tags:
 *       - Blogs
 *     parameters:
 *       - in: path
 *         name: blog_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog whose featured image will be deleted
 *     responses:
 *       200:
 *         description: Featured image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "✅ Featured image deleted successfully"
 *                 blog_id:
 *                   type: integer
 *                   example: 12
 *       400:
 *         description: blog_id missing in params
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "⚠️ blog_id is required"
 *       404:
 *         description: Blog or featured image not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "⚠️ No featured image found for this blog"
 *       500:
 *         description: Failed to delete featured image
 *         content:
 *           application/json
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "❌ Failed to delete featured image"
 *                 details:
 *                   type: string
 *                   example: "Cloudinary deletion error"
 */


export const deleteFeaturedImage = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { blog_id } = req.params;
    if (!blog_id) {
      return res.status(400).json({ error: "⚠️ blog_id is required" });
    }

    // Get the featured image public_id
    const [blogs] = await connection.query(
      `SELECT featured_image_public_id FROM blogs WHERE id = ?`,
      [blog_id]
    );

    if (blogs.length === 0) {
      return res.status(404).json({ error: "⚠️ Blog not found" });
    }

    const publicId = blogs[0].featured_image_public_id;

    if (!publicId) {
      return res.status(404).json({ error: "⚠️ No featured image found for this blog" });
    }

    // Delete from Cloudinary
    const cloudinaryResult = await cloudinary.uploader.destroy(publicId);
    if (cloudinaryResult.result !== "ok" && cloudinaryResult.result !== "not found") {
      return res.status(500).json({ error: "❌ Failed to delete image from Cloudinary" });
    }

    // Remove image references in database
    await connection.query(
      `UPDATE blogs 
       SET featured_image_url = NULL, featured_image_public_id = NULL, updated_at = NOW()
       WHERE id = ?`,
      [blog_id]
    );

    return res.status(200).json({
      message: "✅ Featured image deleted successfully",
      blog_id,
    });
  } catch (err) {
    console.error("Delete featured image error:", err);
    return res.status(500).json({
      error: "❌ Failed to delete featured image",
      details: err.message,
    });
  } finally {
    connection.release();
  }
};




/**
 * @swagger
 * /blogs/create:
 *   post:
 *     summary: Create a new blog
 *     tags:
 *       - Blogs
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "How to Learn Node.js"
 *               slug:
 *                 type: string
 *                 example: "learn-nodejs"
 *               content:
 *                 type: string
 *                 example: "<p>Node.js guide...</p>"
 *               excerpt:
 *                 type: string
 *                 example: "Short blog summary..."
 *               published_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-28 14:30:00"
 *               featured_image_url:
 *                 type: string
 *                 example: "https://res.cloudinary.com/sample.jpg"
 *               featured_image_public_id:
 *                 type: string
 *                 example: "blogs/sample-img"
 *               meta_title:
 *                 type: string
 *                 example: "Learn Node.js SEO Title"
 *               meta_description:
 *                 type: string
 *                 example: "SEO description for the blog"
 *               images:
 *                 type: string
 *                 description: JSON array of images with url and public_id
 *                 example: '[{"url": "https://image1.jpg", "public_id": "img1"}, {"url": "https://image2.jpg", "public_id": "img2"}]'
 *             required:
 *               - title
 *               - slug
 *               - content
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
 *                 blog:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 12
 *                     title:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     content:
 *                       type: string
 *                     excerpt:
 *                       type: string
 *                     published_at:
 *                       type: string
 *                       nullable: true
 *                     featured_image_url:
 *                       type: string
 *                     featured_image_public_id:
 *                       type: string
 *                     meta_title:
 *                       type: string
 *                     meta_description:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           url:
 *                             type: string
 *                           public_id:
 *                             type: string
 *       400:
 *         description: Slug duplicate or required fields missing
 *       500:
 *         description: Server error while creating blog
 */



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

    // Parse images JSON safely
    let images = [];
    if (req.body.images) {
      try {
        images = typeof req.body.images === "string" ? JSON.parse(req.body.images) : req.body.images;
      } catch {
        images = [];
      }
    }

    // Required fields
    if (!title || !slug || !content) {
      return res.status(400).json({ error: "Title, slug, and content are required." });
    }

    const hasPublishedAt = published_at && !isNaN(new Date(published_at).getTime());

    const blogQuery = `
      INSERT INTO blogs 
      (title, slug, content, excerpt, ${hasPublishedAt ? "published_at, " : ""}featured_image_url, featured_image_public_id, meta_title, meta_description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ${hasPublishedAt ? "?, " : ""}?, ?, ?, ?, NOW(), NOW())
    `;

    const blogValues = [
      title,
      slug,
      content,
      excerpt || "",
      ...(hasPublishedAt ? [new Date(published_at).toISOString().slice(0, 19).replace("T", " ")] : []),
      featured_image_url || "",
      featured_image_public_id || "",
      meta_title || "",
      meta_description || "",
    ];

    const [result] = await connection.query(blogQuery, blogValues);
    const blogId = result.insertId;

    // Save additional images
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
      message: "✅ Blog created successfully",
      blog: {
        id: blogId,
        title,
        slug,
        content,
        excerpt: excerpt || "",
        published_at: hasPublishedAt ? published_at : null,
        featured_image_url: featured_image_url || "",
        featured_image_public_id: featured_image_public_id || "",
        meta_title: meta_title || "",
        meta_description: meta_description || "",
        images,
      },
    });
  } catch (err) {
    await connection.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Slug already exists." });
    }
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    connection.release();
  }
};


/**
 * @swagger
 * /blogs/update/{id}:
 *   patch:
 *     summary: Update an existing blog
 *     tags:
 *       - Blogs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated Node.js Guide"
 *               slug:
 *                 type: string
 *                 example: "updated-nodejs-guide"
 *               content:
 *                 type: string
 *                 example: "<p>Updated HTML content...</p>"
 *               excerpt:
 *                 type: string
 *                 example: "Updated short blog summary..."
 *               published_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-28 14:30:00"
 *               meta_title:
 *                 type: string
 *                 example: "Updated SEO Meta Title"
 *               meta_description:
 *                 type: string
 *                 example: "Updated SEO meta description"
 *               featured_image_url:
 *                 type: string
 *                 example: "https://res.cloudinary.com/new-featured.jpg"
 *               featured_image_public_id:
 *                 type: string
 *                 example: "blogs/new_featured_img"
 *               images:
 *                 type: string
 *                 description: JSON array of new images. Replaces all old images.
 *                 example: |
 *                   [
 *                     {"url": "https://new-image1.jpg", "public_id": "new1"},
 *                     {"url": "https://new-image2.jpg", "public_id": "new2"}
 *                   ]
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
 *                   example: "✅ Blog updated successfully"
 *                 updatedFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["title", "slug", "content"]
 *                 deletedImage:
 *                   type: string
 *                   nullable: true
 *                   example: "old_public_id"
 *                 newImages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                       public_id:
 *                         type: string
 *       404:
 *         description: Blog not found
 *       500:
 *         description: Server error while updating blog
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
 * /blog/{blog_id}:
 *   delete:
 *     summary: Delete a blog and all associated data
 *     tags:
 *       - Blogs
 *     parameters:
 *       - in: path
 *         name: blog_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the blog to delete
 *     responses:
 *       200:
 *         description: Blog deleted successfully along with its related records and Cloudinary images
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "✅ Blog and all associated data deleted successfully."
 *                 blogId:
 *                   type: integer
 *                   example: 15
 *       400:
 *         description: Blog ID missing in params
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Blog ID is required."
 *       404:
 *         description: Blog not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Blog not found."
 *       500:
 *         description: Server error while deleting blog and related data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Server error. Could not delete the blog."
 *                 details:
 *                   type: string
 *                   example: "Cloudinary deletion error details..."
 */


export const deleteBlog = async (req, res) => {
  const { blog_id } = req.params;

  if (!blog_id) {
    return res.status(400).json({ error: "Blog ID is required." });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Step 1: Get public IDs of all associated images for Cloudinary deletion
    // We need to do this before deleting the database records.
    const [imagesResult] = await connection.query(
      'SELECT image_public_id FROM blog_images WHERE blog_id = ?',
      [blog_id]
    );
    const imagePublicIds = imagesResult.map(row => row.image_public_id).filter(Boolean);

    const [blogResult] = await connection.query(
      'SELECT featured_image_public_id FROM blogs WHERE id = ?',
      [blog_id]
    );
    const featuredImagePublicId = blogResult[0]?.featured_image_public_id;

    // Step 2: Delete related records from dependent tables first
    await connection.query('DELETE FROM blog_comments WHERE blog_id = ?', [blog_id]);
    await connection.query('DELETE FROM blog_likes WHERE blog_id = ?', [blog_id]);
    await connection.query('DELETE FROM blog_shares WHERE blog_id = ?', [blog_id]);
    await connection.query('DELETE FROM blog_images WHERE blog_id = ?', [blog_id]);

    // Step 3: Delete the blog post itself
    const [deleteBlogResult] = await connection.query('DELETE FROM blogs WHERE id = ?', [blog_id]);

    if (deleteBlogResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Blog not found." });
    }

    // Step 4: Delete images from Cloudinary (outside the database transaction)
    // This step happens after the database commit, so the transaction isn't held up.
    if (featuredImagePublicId) {
      await cloudinary.uploader.destroy(featuredImagePublicId);
      console.log(`Featured image ${featuredImagePublicId} deleted from Cloudinary.`);
    }
    if (imagePublicIds.length > 0) {
      // You can use the destroy method for a single image, or delete_resources for multiple
      for (const publicId of imagePublicIds) {
        await cloudinary.uploader.destroy(publicId);
      }
      console.log(`Blog images ${imagePublicIds.join(', ')} deleted from Cloudinary.`);
    }

    await connection.commit();

    return res.status(200).json({
      message: "✅ Blog and all associated data deleted successfully.",
      blogId: blog_id,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Server error during blog deletion:", err);
    return res.status(500).json({ error: "Server error. Could not delete the blog.", details: err.message });
  } finally {
    connection.release();
  }
};



/**
 * @swagger
 * /blogs/{blogId}/like:
 *   post:
 *     summary: Toggle like on a blog by the authenticated user
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
 *         description: The ID of the blog to be liked or unliked
 *     responses:
 *       200:
 *         description: Like status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Blog liked successfully"
 *                 likes_count:
 *                   type: integer
 *                   example: 5
 *                 liked:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid blog ID provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid blog ID"
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
 *         description: Server error occurred
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 details:
 *                   type: string
 *                   example: "Error details message"
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



/**
 * @swagger
 * /blogs/:blogId/likes:
 *   get:
 *     summary: Get total likes and user like status for a blog
 *     description: >
 *       Retrieves the total number of likes for a specific blog post.  
 *       If the user is authenticated, it also indicates whether the user has liked the blog.
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
 *         description: The ID of the blog post to retrieve like information for
 *         example: 8
 *     responses:
 *       200:
 *         description: Successfully retrieved like information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blogId:
 *                   type: integer
 *                   example: 8
 *                 likes_count:
 *                   type: integer
 *                   example: 45
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
 *                   example: "Invalid blog ID"
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
 *         description: Server error while fetching like data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 details:
 *                   type: string
 *                   example: "Detailed error message"
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




/**
 * @swagger
 * /blogs/:blogId/comments:
 *   post:
 *     summary: Add a new comment to a blog
 *     description: >
 *       Allows an authenticated user to add a comment to a specific blog post.
 *       The comment text must not be empty.
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
 *         description: The ID of the blog post to comment on
 *         example: 12
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *                 example: "This is a really insightful post!"
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
 *                   example: "Comment added successfully"
 *                 comment_id:
 *                   type: integer
 *                   example: 45
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-28 17:42:10"
 *       400:
 *         description: Invalid or empty comment text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Comment cannot be empty"
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
 *         description: Server error while adding comment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 details:
 *                   type: string
 *                   example: "Detailed error message"
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
 * /blogs/:blogId/comments:
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
 * /blog/:slug/share:
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
 * /blog/:slug/share-count:
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
 * /blogs/:id:
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




