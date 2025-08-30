import express from 'express';
import { authorizeAdmin, verifyToken } from '../middleware/authMiddleware.js';
import { getVerifiedDoctorDetailsById, getVerifiedDoctors, getVerifiedDoctorsDetails, handleActivateUser, handleDeactivateUser } from '../controllers/user.controller.js';
import { getAllDoctorsWithPracticeDetails, getAllHospitals, getAllPatients, getClinicById, getDoctorRatingsAndReviews  } from '../controllers/hospitals.controller.js';
import { getAllChannelPartners, getAllReferrals } from '../controllers/referal.controller.js';

const router = express.Router();

router.patch('/admin/users/:userId/deactivate', verifyToken, authorizeAdmin, handleDeactivateUser);
router.patch('/admin/users/:userId/activate', verifyToken, authorizeAdmin, handleActivateUser);
router.get('/admin/doctors/verified', getVerifiedDoctors);
router.get('/admin/doctors/verified-details', getVerifiedDoctorsDetails);
router.get("/admin/doctors/verified-details/:id", getVerifiedDoctorDetailsById);

router.get('/admin/doctors/hospitals', getAllHospitals);
router.get('/admin/clinics/:id', getClinicById);
router.get('/admin/doctors/workplaces', getAllDoctorsWithPracticeDetails);
router.get('/admin/patients', getAllPatients);
router.get('/admin/reviews', getDoctorRatingsAndReviews);

// channel-partner

router.get("/admin/channel-partners", getAllChannelPartners);
router.get("/admin/refrals-details", getAllReferrals);

export default router;