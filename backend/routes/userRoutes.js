const express = require('express');
const { getUser, addUserData, getUserData } = require('../backend/controllers/userController');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

// ดึงข้อมูลผู้ใช้
router.get('/', authenticateToken, getUser);

// เพิ่มข้อมูลในฟิลด์ data
router.post('/data', authenticateToken, addUserData);

// ดึงข้อมูลทั้งหมดในฟิลด์ data
router.get('/data', authenticateToken, getUserData);

module.exports = router;