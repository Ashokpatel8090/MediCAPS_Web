import db from "../config/db.js";

export const getAllChannelPartners = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        cpp.*, 
        u.full_name, 
        u.email, 
        u.phone
      FROM channel_partner_profiles cpp
      JOIN users u ON cpp.user_id = u.id
    `);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching channel partners:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch channel partners",
      error: error.message,
    });
  }
};






export const getAllReferrals = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        r.id AS referral_id,
        r.referral_code,
        r.status,
        r.created_at,
        
        -- Referrer details
        u1.id AS referrer_id,
        u1.full_name AS referrer_name,
        u1.email AS referrer_email,
        u1.phone AS referrer_phone,
        
        -- Referee details
        u2.id AS referee_id,
        u2.full_name AS referee_name,
        u2.email AS referee_email,
        u2.phone AS referee_phone
        
      FROM referrals r
      JOIN users u1 ON r.referrer_id = u1.id
      JOIN users u2 ON r.referee_id = u2.id
      ORDER BY r.created_at DESC
    `);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching referrals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch referrals",
      error: error.message,
    });
  }
};