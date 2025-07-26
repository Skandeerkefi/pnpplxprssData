const { SlotCall } = require("../models/SlotCall");

exports.createSlotCall = async (req, res) => {
	const { name, betAmount } = req.body;

	if (!name || !betAmount) {
		return res.status(400).json({ message: "Missing fields." });
	}

	try {
		const slotCall = new SlotCall({
			user: req.user.id,
			name,
			betAmount,
		});
		await slotCall.save();
		res.status(201).json({ message: "Slot call submitted", slotCall });
	} catch (err) {
		res.status(500).json({ error: "Slot call failed" });
	}
};

exports.getAllSlotCalls = async (req, res) => {
	try {
		const calls = await SlotCall.find()
			.populate("user", "kickUsername")
			.sort({ createdAt: -1 });
		res.json(calls);
	} catch (err) {
		res.status(500).json({ error: "Fetch failed" });
	}
};

exports.getUserSlotCalls = async (req, res) => {
	try {
		const calls = await SlotCall.find({ user: req.user.id }).sort({
			createdAt: -1,
		});
		res.json(calls);
	} catch (err) {
		res.status(500).json({ error: "Fetch failed" });
	}
};

exports.changeSlotCallStatus = async (req, res) => {
	const { status } = req.body;
	const { id } = req.params;

	if (!["accepted", "rejected"].includes(status)) {
		return res.status(400).json({ message: "Invalid status." });
	}

	try {
		const updated = await SlotCall.findByIdAndUpdate(
			id,
			{ status },
			{ new: true }
		).populate("user", "kickUsername");

		if (!updated)
			return res.status(404).json({ message: "Slot call not found." });

		res.status(200).json({ message: `Slot call ${status}`, slotCall: updated });
	} catch (err) {
		res.status(500).json({ message: "Update failed" });
	}
};
