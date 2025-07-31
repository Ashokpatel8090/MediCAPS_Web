// src/controllers/userController.js

import { deactivateUser, activateUser, isUserActive } from '../models/User.js';
import db from '../config/db.js';

/**
 * @swagger
 * /admin/users/{userId}/deactivate:
 *   patch:
 *     summary: Deactivate a user account
 *     description: Admins can deactivate other users. Cannot deactivate themselves.
 *     security:
 *       - bearerAuth: []
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to deactivate
 *     responses:
 *       200:
 *         description: User account deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStatusResponse'
 *       400:
 *         description: Invalid operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin access only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const handleDeactivateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const loggedInUserId = req.user.sub;

    if (parseInt(loggedInUserId) === parseInt(userId)) {
      return res.status(400).json({
        message: 'Admin cannot deactivate their own account via this endpoint.',
      });
    }

    const isActive = await isUserActive(userId);
    if (isActive === false) {
      return res.status(400).json({ message: 'User is already deactivated' });
    } else if (isActive === null) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedRows = await deactivateUser(userId);
    if (updatedRows === 0) {
      return res.status(404).json({ message: 'User not found or already inactive' });
    }

    res.status(200).json({ message: 'User account deactivated successfully' });
  } catch (error) {
    console.error('❌ Error deactivating user:', error);
    res.status(500).json({ message: 'Server error during deactivation' });
  }
};

/**
 * @swagger
 * /admin/users/{userId}/activate:
 *   patch:
 *     summary: Activate a user account
 *     description: Admins can activate other users. Cannot activate themselves.
 *     security:
 *       - bearerAuth: []
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to activate
 *     responses:
 *       200:
 *         description: User account activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStatusResponse'
 *       400:
 *         description: Already active or invalid attempt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin access only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const handleActivateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const loggedInUserId = req.user.sub;

    if (parseInt(loggedInUserId) === parseInt(userId)) {
      return res.status(400).json({
        message: 'Admin cannot activate their own account via this endpoint.',
      });
    }

    const isActive = await isUserActive(userId);
    if (isActive === true) {
      return res.status(400).json({ message: 'User is already active' });
    } else if (isActive === null) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedRows = await activateUser(userId);
    if (updatedRows === 0) {
      return res.status(404).json({ message: 'User already active' });
    }

    res.status(200).json({ message: 'User account activated successfully' });
  } catch (error) {
    console.error('❌ Error activating user:', error);
    res.status(500).json({ message: 'Server error during activation' });
  }
};




/**
 * @swagger
 * /api/admin/doctors/verified:
 *   get:
 *     summary: Get all verified doctors
 *     description: Fetches a list of all doctors whose `is_verified` field is set to `'1'` and not null.
 *     tags:
 *       - Doctors
 *     responses:
 *       200:
 *         description: A list of verified doctors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   average_rating:
 *                     type: number
 *                     format: float
 *                     example: 4.7
 *                   total_reviews:
 *                     type: integer
 *                     example: 28
 *                   is_verified:
 *                     type: string
 *                     example: "1"
 *                   profile_url:
 *                     type: string
 *                     nullable: true
 *                     example: "https://medicaps/doctor_profiles/example.jpg"
 *                   profile_img_public_id:
 *                     type: string
 *                     nullable: true
 *                     example: "cloudinary_public_id"
 *       500:
 *         description: Server error
 */




export const getVerifiedDoctors = async (req, res) => {
  try {
    const { name, email, specialization_name } = req.query;

    let query = `
      SELECT d.*, u.full_name AS doctor_name, u.email, s.name AS specialization_name
      FROM doctors d
      INNER JOIN users u ON d.user_id = u.id
      LEFT JOIN specializations s ON d.specialization_id = s.id
      WHERE d.is_verified = 1
    `;

    const params = [];

    if (name) {
      query += ' AND u.full_name LIKE ?';
      params.push(`%${name}%`);
    }

    if (email) {
      query += ' AND u.email LIKE ?';
      params.push(`%${email}%`);
    }

    if (specialization_name) {
      query += ' AND s.name LIKE ?';
      params.push(`%${specialization_name}%`);
    }

    

    const [rows] = await db.query(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching verified doctors:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};










/**
 * @swagger
 * /api/admin/doctors/verified-details:
 *   get:
 *     summary: Get all verified doctors with full profile and related details
 *     description: Returns a list of verified doctors including personal info, address, qualifications, schedules, slots, appointments, and documents.
 *     tags:
 *       - Doctors
 *     responses:
 *       200:
 *         description: A list of verified doctor profiles with full detail
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   doctor_id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "Harshvardhan Singh"
 *                   email:
 *                     type: string
 *                     example: "pateldiploma@gmail.com"
 *                   phone:
 *                     type: string
 *                     example: "8879543448"
 *                   bio:
 *                     type: string
 *                     example: "Cardiologist with 10 years experience"
 *                   experience_years:
 *                     type: integer
 *                     example: 10
 *                   languages_spoken:
 *                     type: string
 *                     example: "English, Hindi"
 *                   average_rating:
 *                     type: string
 *                     example: "0.00"
 *                   total_reviews:
 *                     type: integer
 *                     example: 0
 *                   is_verified:
 *                     type: integer
 *                     example: 1
 *                   profile_url:
 *                     type: string
 *                     example: "https://res.cloudinary.com/.../doctor_profiles/image.jpg"
 *                   profile_img_public_id:
 *                     type: string
 *                     example: "medicaps/doctor_profiles/baiop5oxu1umtddwt4cv"
 *                   address:
 *                     type: string
 *                     example: "123 Baker Street"
 *                   postal_code:
 *                     type: string
 *                     example: "110001"
 *                   city:
 *                     type: string
 *                     example: "Arwal"
 *                   state:
 *                     type: string
 *                     example: "Bihar"
 *                   country:
 *                     type: string
 *                     example: "India"
 *                   qualifications:
 *                     type: string
 *                     example: "MBBS from KGMU (2025); degree from institution (2023)"
 *                   schedules:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         day_of_week:
 *                           type: integer
 *                           example: 4
 *                         start_time:
 *                           type: string
 *                           example: "19:00:00"
 *                         end_time:
 *                           type: string
 *                           example: "22:00:00"
 *                         consultation_mode:
 *                           type: string
 *                           example: "Online"
 *                         is_active:
 *                           type: integer
 *                           example: 1
 *                   availability_slots:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         slot_start_time:
 *                           type: string
 *                           example: "16:08:00"
 *                         slot_end_time:
 *                           type: string
 *                           example: "22:15:00"
 *                         consultation_mode:
 *                           type: string
 *                           example: "InPerson"
 *                         slot_date:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-07-07T18:30:00.000Z"
 *                         created_from_schedule_id:
 *                           type: integer
 *                           example: 8
 *                   appointments:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 9
 *                         slot_id:
 *                           type: integer
 *                           example: 15
 *                         patient_profile_id:
 *                           type: integer
 *                           example: 1
 *                         status:
 *                           type: string
 *                           example: "Scheduled"
 *                         consultation_type:
 *                           type: string
 *                           example: "Video"
 *                         patient_symptoms:
 *                           type: string
 *                           example: "swelling in leg"
 *                         channel_name:
 *                           type: string
 *                           example: "appointment_9"
 *                   documents:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 5
 *                         doctor_id:
 *                           type: integer
 *                           example: 1
 *                         document_type:
 *                           type: string
 *                           example: "Government ID"
 *                         document_url:
 *                           type: string
 *                           example: "https://res.cloudinary.com/.../file_uugiqp.png"
 *                         status:
 *                           type: string
 *                           example: "Approved"
 *                         reviewed_by:
 *                           type: integer
 *                           nullable: true
 *                           example: 3
 *                         remarks:
 *                           type: string
 *                           nullable: true
 *                           example: "Just approved the doctor document"
 *                         reviewed_at:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           example: "2025-07-08T04:43:22.000Z"
 *                         uploaded_at:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-07-07T23:38:38.000Z"
 *                         public_id:
 *                           type: string
 *                           example: "medicaps/doctor_docs/file_uugiqp"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Server error"
 */



export const getVerifiedDoctorsDetails = async (req, res) => {
  try {
    // ✅ Fetch core verified doctor data
    const [rows] = await db.query(`
      SELECT 
        d.id AS doctor_id,
        u.full_name AS name,
        u.email,
        u.phone,
        d.bio,
        d.experience_years,
        d.languages_spoken,
        d.average_rating,
        d.total_reviews,
        d.is_verified,
        d.profile_url,
        d.profile_img_public_id,
        a.street AS address,
        a.postal_code,
        c.name AS city,
        s.name AS state,
        cn.name AS country
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN addresses a ON a.id = d.address_id
      LEFT JOIN states s ON a.state_id = s.id
      LEFT JOIN countries cn ON a.country_id = cn.id
      LEFT JOIN cities c ON a.city_id = c.id
      WHERE d.is_verified = '1' AND d.is_verified IS NOT NULL
    `);

    // ✅ Loop over each doctor
    for (const doctor of rows) {
      const doctorId = doctor.doctor_id;

      // ✅ Qualifications
      const [qualifications] = await db.query(
        `
        SELECT DISTINCT 
          CONCAT(degree_name, ' from ', institution, ' (', completion_year, ')') AS qualification
        FROM doctor_qualifications
        WHERE doctor_id = ?
        `,
        [doctorId]
      );
      doctor.qualifications = qualifications.map(q => q.qualification).join('; ');

      // ✅ Schedules
      const [schedules] = await db.query(
        `
        SELECT 
          day_of_week, start_time, end_time, consultation_mode, is_active
        FROM doctor_schedules
        WHERE doctor_practice_id IN (
          SELECT id FROM doctor_practices WHERE doctor_id = ?
        )
        `,
        [doctorId]
      );
      doctor.schedules = schedules;

      // ✅ Availability Slots
      const [slots] = await db.query(
        `
        SELECT 
          slot_start_time, slot_end_time, consultation_mode, slot_date, created_from_schedule_id
        FROM availability_slots
        WHERE doctor_practice_id IN (
          SELECT id FROM doctor_practices WHERE doctor_id = ?
        )
        `,
        [doctorId]
      );
      doctor.availability_slots = slots;

      // ✅ Appointments with patient names
      const [appointments] = await db.query(
        `
        SELECT 
          a.id,
          a.slot_id,
          a.patient_profile_id,
          a.status,
          a.consultation_type,
          a.patient_symptoms,
          a.channel_name,
          u.full_name AS patient_name
        FROM appointments a
        LEFT JOIN patient_profiles pp ON a.patient_profile_id = pp.id
        LEFT JOIN users u ON pp.user_id = u.id
        WHERE a.doctor_id = ?
        `,
        [doctorId]
      );
      doctor.appointments = appointments;

      // ✅ Documents
      const [documents] = await db.query(
        `
        SELECT d1.*
        FROM doctor_verification_docs d1
        INNER JOIN (
          SELECT MIN(id) AS min_id
          FROM doctor_verification_docs
          WHERE doctor_id = ?
          GROUP BY public_id
        ) d2 ON d1.id = d2.min_id
        `,
        [doctorId]
      );
      doctor.documents = documents;
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error fetching verified doctors:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};


