const GWS = require("../models/GWS");
const { User } = require("../models/User");
const fetch = (...args) =>
	import("node-fetch").then(({ default: fetch }) => fetch(...args));

exports.createGWS = async (req, res) => {
	const { title, endTime } = req.body;

	try {
		const gws = new GWS({ title, endTime, state: "active" });
		await gws.save();
		res.status(201).json({ message: "GWS created", gws });
	} catch (error) {
		res.status(500).json({ error: "Create GWS failed" });
	}
};
async function getUserWager(rainbetUsername) {
	try {
		// Determine current leaderboard range
		const now = new Date();
		const cycleStart = new Date(now);
		cycleStart.setUTCDate(cycleStart.getUTCDate() - (cycleStart.getUTCDate() % 10));
		cycleStart.setUTCHours(0, 0, 0, 0);

		const cycleEnd = new Date(cycleStart);
		cycleEnd.setUTCDate(cycleStart.getUTCDate() + 10);
		cycleEnd.setUTCHours(23, 59, 59, 999);

		const url = `https://services.rainbet.com/v1/external/affiliates?start_at=${cycleStart.toISOString()}&end_at=${cycleEnd.toISOString()}&key=${process.env.RAINBET_API_KEY}`;

		const response = await fetch(url);
		const data = await response.json();

		if (!Array.isArray(data.data)) return 0;

		// Find the user's stats inside the affiliate array  
		const userEntry = data.data.find(
			(entry) => entry.username === rainbetUsername
		);

		return userEntry ? userEntry.wagered || 0 : 0;
	} catch (err) {
		console.error("Error fetching wager:", err);
		return 0;
	}
}

exports.joinGWS = async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		if (!user || !user.rainbetUsername) {
			return res
				.status(400)
				.json({ message: "Rainbet username is required to join GWs." });
		}

		// ✅ Fetch Wager from Rainbet for current leaderboard cycle
		const wager = await getUserWager(user.rainbetUsername);

		if (wager < 25) {
			return res.status(400).json({
				message: `You must wager at least $25 to join this giveaway. Current wager: $${wager}`,
			});
		}

		const gws = await GWS.findById(req.params.id);
		if (!gws) return res.status(404).json({ message: "GWS not found" });

		if (gws.participants.includes(req.user.id)) {
			return res.status(400).json({ message: "Already joined" });
		}

		gws.participants.push(req.user.id);
		gws.totalParticipants += 1;
		gws.totalEntries += 1;
		await gws.save();

		res.json({ message: "Joined GWS", gws });
	} catch (error) {
		console.error("GWS join failed:", error);
		res.status(500).json({ message: "Join failed" });
	}
};

exports.updateGWS = async (req, res) => {
	const { winnerId, state } = req.body;

	try {
		const gws = await GWS.findById(req.params.id);
		if (!gws) return res.status(404).json({ message: "GWS not found" });

		if (winnerId) gws.winner = winnerId;
		if (state && ["active", "complete"].includes(state)) gws.state = state;

		await gws.save();
		res.json({ message: "GWS updated", gws });
	} catch {
		res.status(500).json({ error: "Failed to update GWS" });
	}
};

exports.drawWinner = async (req, res) => {
	try {
		const gws = await GWS.findById(req.params.id).populate("participants");
		if (!gws || gws.participants.length === 0) {
			return res.status(400).json({ message: "No participants to draw from." });
		}

		const randomIndex = Math.floor(Math.random() * gws.participants.length);
		const winner = gws.participants[randomIndex];

		gws.winner = winner._id;
		gws.state = "complete";
		await gws.save();

		res.json({
			message: "Winner selected",
			winner: { id: winner._id, kickUsername: winner.kickUsername },
			gws,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to draw winner." });
	}
};

exports.getAllGWS = async (req, res) => {
	try {
		const giveaways = await GWS.find()
			.populate("winner", "kickUsername")
			.populate("participants", "kickUsername");
		res.json(giveaways);
	} catch (err) {
		console.error("❌ getAllGWS error:", err);
		res.status(500).json({ message: "Failed to fetch giveaways." });
	}
};

// Helper to auto-draw winner and update state
exports.drawWinnerAuto = async (gws) => {
	if (!gws.participants || gws.participants.length === 0) {
		gws.state = "complete";
		await gws.save();
		return;
	}

	const randomIndex = Math.floor(Math.random() * gws.participants.length);
	const winner = gws.participants[randomIndex];

	gws.winner = winner;
	gws.state = "complete";
	await gws.save();
};



