const express = require("express");
const router = express.Router();
const {
	createSlotCall,
	getAllSlotCalls,
	getUserSlotCalls,
	changeSlotCallStatus,
	addBonusCall,
} = require("../controllers/slotCallController");

const { verifyToken, isAdmin } = require("../middleware/auth");

router.post("/", verifyToken, createSlotCall);
router.get("/", verifyToken, isAdmin, getAllSlotCalls);
router.get("/my", verifyToken, getUserSlotCalls);
router.post("/:id/status", verifyToken, isAdmin, changeSlotCallStatus);
router.post("/:id/bonus-call", verifyToken, addBonusCall); // Only if x250 is true

module.exports = router;
