const GWS = require("../models/GWS");
const { User } = require("../models/User");
const fetch = (...args) =>
	import("node-fetch").then(({ default: fetch }) => fetch(...args));

/*
|--------------------------------------------------------------------------
| BI-WEEKLY LEADERBOARD PERIOD CALCULATION
| Starts EXACTLY at 7:00 PM EST (00:00 UTC the next day)
| Repeats every 14 days forever
|--------------------------------------------------------------------------
*/
function getBiweeklyCycle() {
	// First known cycle (your example)
	// 11/22/2025 @ 7:00 PM EST  =  11/23/2025 @ 00:00 UTC
	const firstCycleStart = new Date("2025-11-23T00:00:00Z");

	const now = new Date();

	const cycleMs = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

	// How many cycles have passed since the first cycle
	const cyclesPassed = Math.floor((now - firstCycleStart) / cycleMs);

	// Current bi-weekly cycle range
	const cycleStart = new Date(firstCycleStart.getTime() + cyclesPassed * cycleMs);
	const cycleEnd = new Date(cycleStart.getTime() + cycleMs);

	return { cycleStart, cycleEnd };
}

/*
|--------------------------------------------------------------------------
| Fetch User Wager for Current Bi-Weekly Cycle
|--------------------------------------------------------------------------
*/
async function getUserWager(rainbetUsername) {
	try {
		const { cycleStart, cycleEnd } = getBiweeklyCycle();

		const url = `https://services.rainbet.com/v1/external/affiliates?start_at=${cycleStart.toISOString()}&end_at=${cycleEnd.toISOString()}&key=${process.env.RAINBET_API_KEY}`;

		const response = await fetch(url);
		const data = await response.json();

		if (!Array.isArray(data.data)) return 0;

		const userEntry = data.data.find(entry => entry.username === rainbetUsername);

		return userEntry ? userEntry.wagered || 0 : 0;
	} catch (err) {
		console.error("Error fetching wager:", err);
		return 0;
	}
}

/*
|--------------------------------------------------------------------------
| CREATE GWS
|--------------------------------------------------------------------------
*/
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

/*
|--------------------------------------------------------------------------
| JOIN GWS
|--------------------------------------------------------------------------
*/
exports.joinGWS = async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		if (!user || !user.rainbetUsername) {
			return res
				.status(400)
				.json({ message: "Rainbet username is required to join GWs." });
		}

		// Get user wager for the BI-WEEKLY leaderboard period
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

/*
|--------------------------------------------------------------------------
| UPDATE GWS
|--------------------------------------------------------------------------
*/
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

/*
|--------------------------------------------------------------------------
| DRAW WINNER
|--------------------------------------------------------------------------
*/
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

/*
|--------------------------------------------------------------------------
| GET ALL GIVEAWAYS
|--------------------------------------------------------------------------
*/
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

/*
|--------------------------------------------------------------------------
| AUTO DRAW (if needed)
|--------------------------------------------------------------------------
*/
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
