const mongoose = require("mongoose");

const slotCallSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	name: { type: String, required: true },
	betAmount: { type: Number, required: true },
	status: {
		type: String,
		enum: ["pending", "accepted", "rejected"],
		default: "pending",
	},
	createdAt: { type: Date, default: Date.now },
});

const SlotCall = mongoose.model("SlotCall", slotCallSchema);
module.exports = { SlotCall };
