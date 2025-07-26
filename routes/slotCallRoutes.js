const express = require("express");
const router = express.Router();
const {
	createSlotCall,
	getAllSlotCalls,
	getUserSlotCalls,
	changeSlotCallStatus,
} = require("../controllers/slotCallController");
const { verifyToken, isAdmin } = require("../middleware/auth");

router.post("/", verifyToken, createSlotCall);
router.get("/", verifyToken, isAdmin, getAllSlotCalls);
router.get("/my", verifyToken, getUserSlotCalls);
// Explicit OPTIONS handler for /:id/status
router.options("/:id/status", (req, res) => {
	res.set({
		"Access-Control-Allow-Origin": "http://localhost:5173",
		"Access-Control-Allow-Methods": "POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type,Authorization",
		"Access-Control-Allow-Credentials": "true",
	});
	res.status(200).send();
});
router.post("/:id/status", verifyToken, isAdmin, changeSlotCallStatus);

module.exports = router;
