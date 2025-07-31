import db from '../config/db.js'


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




export const createBlog = async (req, res) => {
  let {
    title,
    slug,
    content,
    excerpt,
    published_at,
    featured_image_url,
    featured_image_public_id,
    meta_title,
    meta_description
  } = req.body;

  // ✅ Format published_at to MySQL DATETIME
  if (published_at) {
    try {
      const dateObj = new Date(published_at);
      published_at = dateObj.toISOString().slice(0, 19).replace('T', ' ');
    } catch (err) {
      return res.status(400).json({ error: 'Invalid published_at format' });
    }
  }

  const query = `
    INSERT INTO blogs 
    (
      title, slug, content, excerpt, published_at, 
      featured_image_url, featured_image_public_id, 
      meta_title, meta_description
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    title,
    slug,
    content,
    excerpt,
    published_at,
    featured_image_url,
    featured_image_public_id,
    meta_title,
    meta_description
  ];

  try {
    const [result] = await db.query(query, values);
    return res.status(201).json({
      message: 'Blog created successfully',
      id: result.insertId
    });
  } catch (err) {
    console.error('MySQL Error:', err);
    return res.status(500).json({ error: err.message });
  }
};




// @desc    Update blog
export const updateBlog = (req, res) => {
  const { id } = req.params;
  const {
    title,
    slug,
    content,
    excerpt,
    published_at,
    featured_image_url,
    featured_image_public_id,
    meta_title,
    meta_description
  } = req.body;

  const query = `
    UPDATE blogs SET 
      title=?, slug=?, content=?, excerpt=?, published_at=?, 
      featured_image_url=?, featured_image_public_id=?, meta_title=?, meta_description=?
    WHERE id=?
  `;

  db.query(
    query,
    [title, slug, content, excerpt, published_at, featured_image_url, featured_image_public_id, meta_title, meta_description, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Blog updated' });
    }
  );
};

// @desc    Delete blog

export const deleteBlog = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM blogs WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Blog deleted' });
  });
};
