import express from 'express';
import { authorizeAdmin, verifyToken } from '../middleware/authMiddleware.js';
import { 
  getUsersWithAddresses,
  getVerifiedDoctorDetailsById, 
  getVerifiedDoctors, 
  getVerifiedDoctorsDetails, 
  handleActivateUser, 
  handleDeactivateUser 
} from '../controllers/user.controller.js';
import { 
  getAllDoctorsWithPracticeDetails, 
  getAllHospitals, 
  getAllPatients, 
  getClinicById, 
  getDoctorRatingsAndReviews  
} from '../controllers/hospitals.controller.js';
import { 
  getAllChannelPartners, 
  getAllReferrals, 
  getAllUsersWithContactsInfo, 
  getUserWithContacts,
  getUserReferrals,   // ✅ import new controller
  getTotalContacts
} from '../controllers/referal.controller.js';
import { 
  getAllMilletProducts, 
  getMilletProductById 
} from '../controllers/millet.controller.js';

const router = express.Router();

// ---------------- Admin: Users ----------------
router.patch('/admin/users/:userId/deactivate', verifyToken, authorizeAdmin, handleDeactivateUser);
router.patch('/admin/users/:userId/activate', verifyToken, authorizeAdmin, handleActivateUser);

// ---------------- Admin: Doctors ----------------
router.get('/admin/doctors/verified', getVerifiedDoctors);
router.get('/admin/doctors/verified-details', getVerifiedDoctorsDetails);
router.get("/admin/doctors/verified-details/:id", getVerifiedDoctorDetailsById);

router.get('/admin/doctors/hospitals', getAllHospitals);
router.get('/admin/clinics/:id', getClinicById);
router.get('/admin/doctors/workplaces', getAllDoctorsWithPracticeDetails);
router.get('/admin/patients', getAllPatients);
router.get('/admin/reviews', getDoctorRatingsAndReviews);

// ---------------- Admin: Channel Partners & Referrals ----------------
router.get("/admin/channel-partners", getAllChannelPartners);
router.get("/admin/refrals-details", getAllReferrals);

// ---------------- Admin: User Contacts ----------------
router.get("/admin/user-contacts/:userId", getUserWithContacts);
router.get("/admin/user-contacts", getAllUsersWithContactsInfo);
router.get("/admin/user/contact-count", getTotalContacts);


// ---------------- Millets ----------------
router.get("/millets/products", getAllMilletProducts);
router.get("/millets/products/:id", getMilletProductById);

// ---------------- Logged-in User Referrals ----------------
router.get('/admin/logged-referals', verifyToken, getUserReferrals);
router.get("/admin/nutritionist/information", verifyToken, getUsersWithAddresses);

export default router;
