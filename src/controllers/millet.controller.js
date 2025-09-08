import db from '../config/db.js'

// Get all millet products with category details
export const getAllMilletProducts = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         mp.id,
         mp.category_id,
         mc.name AS category_name,
         mp.name,
         mp.description,
         mp.price,
         mp.sku,
         mp.stock_quantity,
         mp.image_url,
         mp.public_id,
         mp.is_active,
         mp.nutritional_info_json
       FROM millet_products mp
       LEFT JOIN millet_categories mc ON mp.category_id = mc.id
       WHERE mp.is_active = 1
       ORDER BY mp.id DESC`
    );

    // Safe parse JSON
    const products = rows.map(product => {
      let nutritionalInfo = {};
      if (product.nutritional_info_json) {
        try {
          if (typeof product.nutritional_info_json === "string") {
            nutritionalInfo = JSON.parse(product.nutritional_info_json);
          } else {
            nutritionalInfo = product.nutritional_info_json;
          }
        } catch (err) {
          console.warn(
            `Failed to parse nutritional_info_json for product ID ${product.id}:`,
            err.message
          );
        }
      }
      return {
        ...product,
        nutritional_info: nutritionalInfo,
      };
    });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error fetching millet products:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// ✅ Get a single millet product by ID
export const getMilletProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT 
         mp.id,
         mp.category_id,
         mc.name AS category_name,
         mp.name,
         mp.description,
         mp.price,
         mp.sku,
         mp.stock_quantity,
         mp.image_url,
         mp.public_id,
         mp.is_active,
         mp.nutritional_info_json
       FROM millet_products mp
       LEFT JOIN millet_categories mc ON mp.category_id = mc.id
       WHERE mp.is_active = 1 AND mp.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = rows[0];

    // Safe parse JSON
    let nutritionalInfo = {};
    if (product.nutritional_info_json) {
      try {
        if (typeof product.nutritional_info_json === "string") {
          nutritionalInfo = JSON.parse(product.nutritional_info_json);
        } else {
          nutritionalInfo = product.nutritional_info_json;
        }
      } catch (err) {
        console.warn(
          `Failed to parse nutritional_info_json for product ID ${product.id}:`,
          err.message
        );
      }
    }

    res.status(200).json({
      success: true,
      product: {
        ...product,
        nutritional_info: nutritionalInfo,
      },
    });
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ error: "Server error" });
  }
};
