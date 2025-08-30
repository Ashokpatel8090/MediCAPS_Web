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

    // Group referrals by referrer
    const grouped = {};

    rows.forEach(row => {
      const referrerId = row.referrer_id;

      if (!grouped[referrerId]) {
        grouped[referrerId] = {
          referrer_id: row.referrer_id,
          referrer_name: row.referrer_name,
          referrer_email: row.referrer_email,
          referrer_phone: row.referrer_phone,
          referrals_count: 0,
          referrals: []
        };
      }

      grouped[referrerId].referrals.push({
        referral_id: row.referral_id,
        referral_code: row.referral_code,
        status: row.status,
        created_at: row.created_at,
        referee_id: row.referee_id,
        referee_name: row.referee_name,
        referee_email: row.referee_email,
        referee_phone: row.referee_phone,
      });

      grouped[referrerId].referrals_count++;
    });

    res.status(200).json({
      success: true,
      count: Object.keys(grouped).length, // number of referrers
      data: Object.values(grouped), // array of referrers with their referees
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
