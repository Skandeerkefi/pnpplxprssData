const express = require("express");
const {
	createGWS,
	joinGWS,
	updateGWS,
	drawWinner,
	getAllGWS,
} = require("../controllers/gwsController");

const { verifyToken, isAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", getAllGWS);
router.post("/", verifyToken, isAdmin, createGWS);
router.post("/:id/join", verifyToken, joinGWS);
router.patch("/:id", verifyToken, isAdmin, updateGWS);
router.post("/:id/draw", verifyToken, isAdmin, drawWinner);
// GET /api/test-wager/:username
// Use getUserWager correctly:
router.get("/test-wager/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const wager = await gwsController.getUserWager(username);
    res.json({ username, wager });
  } catch (err) {
    console.error("Error testing wager:", err);
    res.status(500).json({ error: "Failed to fetch user wager" });
  }
});
module.exports = router;
