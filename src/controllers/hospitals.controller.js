// controllers/healthcareController.js

import db from '../config/db.js';

/**
 * @swagger
 * /api/admin/doctors/hospitals:
 *   get:
 *     summary: Get all hospitals with city and address details
 *     description: Returns a list of all hospitals including hospital type, ownership, address, contact, and emergency support.
 *     tags:
 *       - Hospitals
 *     responses:
 *       200:
 *         description: A list of hospitals
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
 *                   name:
 *                     type: string
 *                     example: MedStar General Hospital
 *                   hospital_type:
 *                     type: string
 *                     example: Private
 *                   ownership:
 *                     type: string
 *                     example: MedStar Healthcare Group
 *                   address_line:
 *                     type: string
 *                     example: 123 Health Ave
 *                   postal_code:
 *                     type: string
 *                     example: 110001
 *                   city:
 *                     type: string
 *                     example: New Delhi
 *                   contact_number:
 *                     type: string
 *                     example: 0112345678
 *                   website_url:
 *                     type: string
 *                     example: https://www.medstar.com
 *                   bed_count:
 *                     type: integer
 *                     example: 500
 *                   emergency_available:
 *                     type: boolean
 *                     example: true
 *       500:
 *         description: Server error
 */
export const getAllHospitals = async (req, res) => {
  try {
    const [hospitals] = await db.query(`
      SELECT 
        h.id,
        h.name,
        h.hospital_type,
        h.ownership,
        h.address_line,
        h.postal_code,
        c.name AS city,
        h.contact_number,
        h.website_url,
        h.bed_count,
        h.emergency_available
      FROM hospitals h
      LEFT JOIN cities c ON h.city_id = c.id
    `);

    res.status(200).json(hospitals);
  } catch (error) {
    console.error("❌ Error fetching hospitals:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};


// /**
//  * @swagger
//  * /api/admin/doctors/clinic:
//  *   get:
//  *     summary: Get all clinics with address and city information
//  *     description: Returns a list of all clinics with location details.
//  *     tags:
//  *       - Clinics
//  *     responses:
//  *       200:
//  *         description: A list of clinics
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 type: object
//  *                 properties:
//  *                   id:
//  *                     type: integer
//  *                     example: 1
//  *                   name:
//  *                     type: string
//  *                     example: Healthy Smiles Dental Clinic
//  *                   address_line:
//  *                     type: string
//  *                     example: Shop No. 5, Sector 14, Dwarka
//  *                   postal_code:
//  *                     type: string
//  *                     example: 110078
//  *                   city:
//  *                     type: string
//  *                     example: New Delhi
//  *       500:
//  *         description: Server error
//  */
// export const getAllClinics = async (req, res) => {
//   try {
//     const [clinics] = await db.query(`
//       SELECT 
//         cl.id,
//         cl.name,
//         cl.address_line,
//         cl.postal_code,
//         c.name AS city
//       FROM clinics cl
//       LEFT JOIN cities c ON cl.city_id = c.id
//     `);

//     res.status(200).json(clinics);
//   } catch (error) {
//     console.error("❌ Error fetching clinics:", error.message);
//     res.status(500).json({ error: "Server error" });
//   }
// };


// controllers/healthcareController.js

// GET /api/clinics/:id - Fetch single clinic by ID
/**
 * @swagger
 * /api/clinics/{id}:
 *   get:
 *     summary: Get a single clinic by ID
 *     description: Returns details of a clinic including address and city by its ID.
 *     tags:
 *       - Clinics
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the clinic to retrieve
 *     responses:
 *       200:
 *         description: Clinic found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: Healthy Smiles Dental Clinic
 *                 address_line:
 *                   type: string
 *                   example: Shop No. 5, Sector 14, Dwarka
 *                 postal_code:
 *                   type: string
 *                   example: 110078
 *                 city:
 *                   type: string
 *                   example: New Delhi
 *       404:
 *         description: Clinic not found
 *       500:
 *         description: Server error
 */
export const getClinicById = async (req, res) => {
  const { id } = req.params;

  try {
    const [clinic] = await db.query(
      `
      SELECT 
        cl.id,
        cl.name,
        cl.address_line,
        cl.postal_code,
        c.name AS city
      FROM clinics cl
      LEFT JOIN cities c ON cl.city_id = c.id
      WHERE cl.id = ?
      `,
      [id]
    );

    if (clinic.length === 0) {
      return res.status(404).json({ error: "Clinic not found" });
    }

    res.status(200).json(clinic[0]);
  } catch (error) {
    console.error("❌ Error fetching clinic by ID:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};




export async function getAllDoctorsWithPracticeDetails(req, res) {
  try {
    // Step 1: Get doctor + practice details
    const [rows] = await db.query(`
      SELECT
        d.id AS doctor_id,
        u.full_name,
        d.specialization_id,
        s.name AS specialization_name,

        dp.id AS doctor_practice_id,
        dp.practice_type,
        dp.is_primary,
        dp.consultation_fee,
        dp.notes,

        -- Clinic Info
        c.id AS clinic_id,
        c.name AS clinic_name,
        c.address_line AS clinic_address,
        c.postal_code AS clinic_postal_code,
        c.city_id AS clinic_city_id,

        -- Hospital Info
        hd.id AS hospital_department_id,
        hd.floor AS department_floor,
        hd.description AS department_description,
        h.id AS hospital_id,
        h.name AS hospital_name,
        h.hospital_type,
        h.address_line AS hospital_address,
        h.postal_code AS hospital_postal_code,
        h.city_id AS hospital_city_id,

        -- Schedules
        ds.id AS schedule_id,
        ds.day_of_week,
        ds.start_time,
        ds.end_time,
        ds.consultation_mode,
        ds.is_active

      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specializations s ON d.specialization_id = s.id
      LEFT JOIN doctor_practices dp ON dp.doctor_id = d.id
      LEFT JOIN clinics c ON dp.clinic_id = c.id
      LEFT JOIN hospital_departments hd ON dp.hospital_department_id = hd.id
      LEFT JOIN hospitals h ON hd.hospital_id = h.id
      LEFT JOIN doctor_schedules ds ON ds.doctor_practice_id = dp.id
      WHERE dp.clinic_id IS NOT NULL OR dp.hospital_department_id IS NOT NULL
      ORDER BY d.id;
    `);

    // Step 2: Get qualifications and documents
    const [qualifications] = await db.query(`
      SELECT doctor_id, degree_name, institution, completion_year
      FROM doctor_qualifications
    `);

    const [documents] = await db.query(`
      SELECT doctor_id, document_type, document_url, status, reviewed_by, remarks
      FROM doctor_verification_docs
    `);

    // Step 3: Build doctor map
    const doctorsMap = new Map();

    for (const row of rows) {
      if (!doctorsMap.has(row.doctor_id)) {
        doctorsMap.set(row.doctor_id, {
          doctor_id: row.doctor_id,
          full_name: row.full_name,
          specialization: {
            id: row.specialization_id,
            name: row.specialization_name
          },
          qualifications: [],
          documents: [],
          clinics: [],
          hospitals: [],
          practices: []
        });
      }

      const doctor = doctorsMap.get(row.doctor_id);

      const schedule = row.schedule_id
        ? {
            id: row.schedule_id,
            day_of_week: row.day_of_week,
            start_time: row.start_time,
            end_time: row.end_time,
            consultation_mode: row.consultation_mode,
            is_active: !!row.is_active
          }
        : null;

      // Add to practices (deduplicated)
      if (!doctor.practices.some(p => p.id === row.doctor_practice_id)) {
        doctor.practices.push({
          id: row.doctor_practice_id,
          clinic_id: row.clinic_id,
          hospital_department_id: row.hospital_department_id,
          consultation_fee: row.consultation_fee,
          is_primary: !!row.is_primary,
          practice_type: row.practice_type,
          notes: row.notes
        });
      }

      // Clinic info
      if (row.clinic_id) {
        let clinic = doctor.clinics.find(c => c.id === row.clinic_id);
        if (!clinic) {
          clinic = {
            id: row.clinic_id,
            name: row.clinic_name,
            address: row.clinic_address,
            postal_code: row.clinic_postal_code,
            city_id: row.clinic_city_id,
            practice_type: row.practice_type,
            is_primary: !!row.is_primary,
            schedules: []
          };
          doctor.clinics.push(clinic);
        }

        if (schedule && !clinic.schedules.some(s => s.id === schedule.id)) {
          clinic.schedules.push(schedule);
        }
      }

      // Hospital info
      if (row.hospital_id) {
        let hospital = doctor.hospitals.find(
          h =>
            h.hospital_id === row.hospital_id &&
            h.department?.id === row.hospital_department_id
        );

        if (!hospital) {
          hospital = {
            hospital_id: row.hospital_id,
            name: row.hospital_name,
            hospital_type: row.hospital_type,
            address: row.hospital_address,
            postal_code: row.hospital_postal_code,
            city_id: row.hospital_city_id,
            department: {
              id: row.hospital_department_id,
              floor: row.department_floor,
              description: row.department_description
            },
            practice_type: row.practice_type,
            is_primary: !!row.is_primary,
            schedules: []
          };
          doctor.hospitals.push(hospital);
        }

        if (schedule && !hospital.schedules.some(s => s.id === schedule.id)) {
          hospital.schedules.push(schedule);
        }
      }
    }

    // Step 4: Attach qualifications
    for (const qual of qualifications) {
      const doctor = doctorsMap.get(qual.doctor_id);
      if (
        doctor &&
        !doctor.qualifications.some(
          q =>
            q.degree_name === qual.degree_name &&
            q.institution === qual.institution &&
            q.completion_year === qual.completion_year
        )
      ) {
        doctor.qualifications.push({
          degree_name: qual.degree_name,
          institution: qual.institution,
          completion_year: qual.completion_year
        });
      }
    }

    // Step 5: Attach documents
    for (const doc of documents) {
      const doctor = doctorsMap.get(doc.doctor_id);
      if (
        doctor &&
        !doctor.documents.some(
          d =>
            d.document_type === doc.document_type &&
            d.document_url === doc.document_url
        )
      ) {
        doctor.documents.push({
          document_type: doc.document_type,
          document_url: doc.document_url,
          status: doc.status,
          reviewed_by: doc.reviewed_by,
          remarks: doc.remarks
        });
      }
    }

    // Step 6: Send response
    return res.status(200).json({
      data: Array.from(doctorsMap.values())
    });
  } catch (error) {
    console.error("❌ Controller error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}





/**
 * @swagger
 * /api/admin/patients:
 *   get:
 *     summary: Get all patient profiles
 *     description: Fetches all patients along with their documents, medical conditions, and allergies. Supports filtering by full name, email, and gender.
 *     tags:
 *       - Patients
 *     parameters:
 *       - in: query
 *         name: full_name
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter patients by full name (partial match)
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter patients by email (partial match)
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [Male, Female, Other]
 *         required: false
 *         description: Filter patients by gender
 *     responses:
 *       200:
 *         description: A list of patients with documents, conditions, and allergies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   patient_id:
 *                     type: integer
 *                     example: 1
 *                   full_name:
 *                     type: string
 *                     example: "Ravi Kumar"
 *                   email:
 *                     type: string
 *                     example: "ravi@example.com"
 *                   phone:
 *                     type: string
 *                     example: "+91-9876543210"
 *                   relationship:
 *                     type: string
 *                     example: "Self"
 *                   date_of_birth:
 *                     type: string
 *                     format: date
 *                   gender:
 *                     type: string
 *                     example: "Male"
 *                   blood_group:
 *                     type: string
 *                     example: "O+"
 *                   profile_image_url:
 *                     type: string
 *                     example: "https://example.com/patient/image.jpg"
 *                   documents:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         document_name:
 *                           type: string
 *                         document_type:
 *                           type: string
 *                         document_url:
 *                           type: string
 *                   conditions:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         condition_name:
 *                           type: string
 *                         diagnosed_on:
 *                           type: string
 *                           format: date
 *                         condition_status:
 *                           type: string
 *                         notes:
 *                           type: string
 *                   allergies:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         allergen:
 *                           type: string
 *                         severity:
 *                           type: string
 *                         reaction_notes:
 *                           type: string
 *       500:
 *         description: Internal server error
 */
export const getAllPatients = async (req, res) => {
  try {
    const { full_name, email, gender, specialization_name } = req.query;

    // Base SQL query
    let baseQuery = `
      SELECT
        p.id AS patient_id,
        u.full_name,
        u.email,
        u.phone,
        p.relationship,
        p.date_of_birth,
        p.gender,
        p.blood_group,
        p.profile_image_url,
        p.created_at,

        -- Documents
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'document_name', d.document_name,
              'document_type', d.document_type,
              'document_url', d.document_url
            )
          )
          FROM patient_documents d
          WHERE d.patient_profile_id = p.id
        ) AS documents,

        -- Conditions
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'condition_name', c.condition_name,
              'diagnosed_on', c.diagnosed_on,
              'condition_status', c.condition_status,
              'notes', c.notes
            )
          )
          FROM patient_conditions c
          WHERE c.patient_profile_id = p.id
        ) AS conditions,

        -- Allergies
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'allergen', a.allergen,
              'severity', a.severity,
              'reaction_notes', a.reaction_notes
            )
          )
          FROM patient_allergies a
          WHERE a.patient_profile_id = p.id
        ) AS allergies

      FROM patient_profiles p
      JOIN users u ON u.id = p.user_id
    `;

    const whereClauses = [];
    const params = [];

    if (full_name) {
      whereClauses.push(`u.full_name LIKE ?`);
      params.push(`%${full_name}%`);
    }

    if (email) {
      whereClauses.push(`u.email LIKE ?`);
      params.push(`%${email}%`);
    }

    if (gender) {
      whereClauses.push(`p.gender = ?`);
      params.push(gender);
    }

    if (whereClauses.length > 0) {
      baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    // 🔁 Sort by latest created patient
    baseQuery += ' ORDER BY p.created_at DESC';

    const [rows] = await db.query(baseQuery, params);

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching patient data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};





/**
 * @swagger
 * /api/admin/reviews:
 *   get:
 *     summary: Get public ratings and reviews for doctors
 *     description: Returns all public doctor reviews. Optionally filter by the number of past days.
 *     tags:
 *       - Doctors
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: Filter reviews created in the past N days (e.g., ?days=7).
 *     responses:
 *       200:
 *         description: A list of public doctor reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   rating:
 *                     type: number
 *                     example: 4.5
 *                   review_text:
 *                     type: string
 *                     example: "Very professional and kind."
 *                   doctor_name:
 *                     type: string
 *                     example: "Dr. Anjali Sharma"
 *                   patient_name:
 *                     type: string
 *                     example: "Ravi Kumar"
 *       500:
 *         description: Internal Server Error
 */

export const getDoctorRatingsAndReviews = async (req, res) => {
  try {
    // Get 'days' from query params (e.g., ?days=3), default to no filter if missing
    const days = parseInt(req.query.days, 10);

    // Base SQL query
    let sql = `
      SELECT 
        r.rating,
        r.review_text,
        du.full_name AS doctor_name,
        pu.full_name AS patient_name
      FROM reviews r
      JOIN doctors d ON r.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      JOIN patient_profiles p ON r.patient_profile_id = p.id
      JOIN users pu ON p.user_id = pu.id
      WHERE r.is_public = 1
    `;

    // Add time filter if days is valid number
    if (!isNaN(days) && days > 0) {
      sql += ` AND r.created_at >= NOW() - INTERVAL ? DAY `;
    }

    sql += ` ORDER BY r.created_at DESC`;

    // Execute query with parameter if days filter is applied
    const [rows] = !isNaN(days) && days > 0 
      ? await db.query(sql, [days]) 
      : await db.query(sql);

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching doctor ratings and reviews:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

async function getAllDoctors(req, res, next) {
  try {
    const [doctors] = await db.query(`
      SELECT d.id, u.full_name AS name, d.bio,
             d.experience_years, d.languages_spoken, d.average_rating,
             s.name AS specialization
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specializations s ON d.specialization_id = s.id
    `);

    // Get all practices in one query to map later
    const [practices] = await db.query(`
      SELECT dp.doctor_id, dp.consultation_fee, dp.is_primary,
             h.id AS hospital_id, h.name AS hospital_name,
             s.name AS department, hd.floor
      FROM doctor_practices dp
      LEFT JOIN hospital_departments hd ON dp.hospital_department_id = hd.id
      LEFT JOIN hospitals h ON hd.hospital_id = h.id
      LEFT JOIN specializations s ON hd.specialization_id = s.id
    `);

    // Group practices by doctor_id
    const practiceMap = {};
    practices.forEach(p => {
      if (!practiceMap[p.doctor_id]) practiceMap[p.doctor_id] = [];
      practiceMap[p.doctor_id].push({
        hospital_id: p.hospital_id,
        hospital_name: p.hospital_name,
        department: p.department,
        consultation_fee: p.consultation_fee,
        is_primary: p.is_primary,
        floor: p.floor
      });
    });

    // Add hospitals to each doctor
    const result = doctors.map(doc => ({
      ...doc,
      hospitals: practiceMap[doc.id] || []
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}
