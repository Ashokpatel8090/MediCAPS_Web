import db from "../config/db.js";


/**
 * @swagger
 * /admin/channel-partners:
 *   get:
 *     summary: Get all channel partners
 *     description: Fetches all channel partners along with their user details (full name, email, phone).
 *     tags:
 *       - Channel Partners
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched channel partners
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 10
 *                       company_name:
 *                         type: string
 *                         example: ABC Pvt Ltd
 *                       gst_number:
 *                         type: string
 *                         example: 29ABCDE1234F1Z5
 *                       address:
 *                         type: string
 *                         example: 123 Main Street, Mumbai
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-09-01T10:00:00Z
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-09-01T12:00:00Z
 *                       full_name:
 *                         type: string
 *                         example: John Doe
 *                       email:
 *                         type: string
 *                         example: johndoe@example.com
 *                       phone:
 *                         type: string
 *                         example: +91-9876543210
 *       500:
 *         description: Failed to fetch channel partners
 */

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




/**
 * @swagger
 * /admin/refrals-details:
 *   get:
 *     summary: Get all referrals grouped by referrer
 *     description: Fetches all referrals, grouped by the referrer (channel partner) with details of referees.
 *     tags:
 *       - Referrals
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched referrals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       referrer_id:
 *                         type: integer
 *                         example: 10
 *                       referrer_name:
 *                         type: string
 *                         example: Rajesh Kumar
 *                       referrer_email:
 *                         type: string
 *                         example: rajesh@example.com
 *                       referrer_phone:
 *                         type: string
 *                         example: +91-9876543210
 *                       commission_percentage:
 *                         type: number
 *                         format: float
 *                         example: 5.5
 *                       partner_status:
 *                         type: string
 *                         example: active
 *                       total_referrals:
 *                         type: integer
 *                         example: 12
 *                       total_commission_earned:
 *                         type: number
 *                         format: float
 *                         example: 3500.75
 *                       referral_code:
 *                         type: string
 *                         example: REF123XYZ
 *                       referrals_count:
 *                         type: integer
 *                         example: 3
 *                       referrals:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             referral_id:
 *                               type: integer
 *                               example: 101
 *                             status:
 *                               type: string
 *                               example: pending
 *                             created_at:
 *                               type: string
 *                               format: date-time
 *                               example: 2025-09-01T10:00:00Z
 *                             referee_id:
 *                               type: integer
 *                               example: 22
 *                             referee_name:
 *                               type: string
 *                               example: Anjali Sharma
 *                             referee_email:
 *                               type: string
 *                               example: anjali@example.com
 *                             referee_phone:
 *                               type: string
 *                               example: +91-9123456789
 *       500:
 *         description: Failed to fetch referrals
 */


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

        -- Referrer channel partner profile
        cpp.total_referrals,
        cpp.total_commission_earned,
        cpp.commission_percentage,
        cpp.status AS partner_status,

        -- Referee details
        u2.id AS referee_id,
        u2.full_name AS referee_name,
        u2.email AS referee_email,
        u2.phone AS referee_phone
        
      FROM referrals r
      JOIN users u1 ON r.referrer_id = u1.id
      JOIN users u2 ON r.referee_id = u2.id
      LEFT JOIN channel_partner_profiles cpp ON cpp.user_id = u1.id
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
          commission_percentage: row.commission_percentage,
          partner_status: row.partner_status,
          total_referrals: row.total_referrals || 0,
          total_commission_earned: row.total_commission_earned || 0,
          referral_code: row.referral_code, // ✅ put referral_code at referrer level
          referrals_count: 0,
          referrals: []
        };
      }

      // Only push referee details, not referral_code
      grouped[referrerId].referrals.push({
        referral_id: row.referral_id,
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



/**
 * @swagger
 * /admin/user-contacts/:userId:
 *   get:
 *     summary: Get a user with their contacts
 *     description: Fetches a single user by ID along with their associated contacts.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: ID of the user to fetch
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: Successfully fetched user with contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       example: 5
 *                     user_name:
 *                       type: string
 *                       example: Suresh Patel
 *                     email:
 *                       type: string
 *                       example: suresh@example.com
 *                     phone:
 *                       type: string
 *                       example: +91-9876543210
 *                     contacts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           contact_id:
 *                             type: integer
 *                             example: 12
 *                           contact_name:
 *                             type: string
 *                             example: Mahesh Sharma
 *                           contact_number:
 *                             type: string
 *                             example: +91-9123456789
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-09-01T10:00:00Z
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */


// Get user with their contact details
export const getUserWithContacts = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId);
    

    const query = `
      SELECT 
        u.id AS user_id,
        u.full_name AS user_name,
        u.email,
        u.phone,
        uc.id AS contact_id,
        uc.contact_name,
        uc.contact_number,
        uc.created_at AS contact_created_at
      FROM users u
      LEFT JOIN user_contacts uc ON u.id = uc.user_id
      WHERE u.id = ?;
    `;

    const [rows] = await db.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Group user info + contacts
    const userInfo = {
      user_id: rows[0].user_id,
      user_name: rows[0].user_name,
      email: rows[0].email,
      phone: rows[0].phone,
      contacts: rows
        .filter(r => r.contact_id) // exclude if no contacts
        .map(r => ({
          contact_id: r.contact_id,
          contact_name: r.contact_name,
          contact_number: r.contact_number,
          created_at: r.contact_created_at,
        })),
    };

    res.status(200).json({ success: true, data: userInfo });
  } catch (error) {
    console.error("Error fetching user with contacts:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




/**
 * @swagger
 * /admin/user-contacts:
 *   get:
 *     summary: Get all users with contacts info
 *     description: Fetches all users who have at least one contact in the system (basic user info only).
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched users with contacts info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_id:
 *                         type: integer
 *                         example: 7
 *                       user_name:
 *                         type: string
 *                         example: Anita Verma
 *                       email:
 *                         type: string
 *                         example: anita@example.com
 *                       phone:
 *                         type: string
 *                         example: +91-9876543210
 *       500:
 *         description: Server error
 */


export const getAllUsersWithContactsInfo = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        u.id AS user_id,
        u.full_name AS user_name,
        u.email,
        u.phone
      FROM users u
      INNER JOIN user_contacts uc ON u.id = uc.user_id
      ORDER BY u.id ASC;
    `;

    const [rows] = await db.query(query);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching users with contacts info:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getTotalContacts = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT COUNT(*) AS total FROM user_contacts");
    res.json({ totalContacts: rows[0].total });
  } catch (error) {
    console.error("Error fetching total contacts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Get referrals for logged-in user
export const getUserReferrals = async (req, res) => {
  try {
    const userId = req.user?.sub; // ✅ extracted from JWT middleware

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please login." });
    }

    const [rows] = await db.query(
      `SELECT 
         r.id,
         r.referrer_id,
         referrer.full_name AS referrer_name,
         referrer.email AS referrer_email,
         r.referee_id,
         referee.full_name AS referee_name,
         referee.email AS referee_email,
         r.referral_code,
         r.status,
         r.reward_granted,
         r.created_at,
         r.accepted_at,
         r.completed_at
       FROM referrals r
       LEFT JOIN users referrer ON r.referrer_id = referrer.id
       LEFT JOIN users referee ON r.referee_id = referee.id
       WHERE r.referrer_id = ? OR r.referee_id = ?
       ORDER BY r.created_at DESC`,
      [userId, userId]
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      referrals: rows,
    });
  } catch (error) {
    console.error("Error fetching user referrals:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};
