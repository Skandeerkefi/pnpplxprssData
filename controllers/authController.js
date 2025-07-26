const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
	const { kickUsername, password, confirmPassword } = req.body;

	if (password !== confirmPassword) {
		return res.status(400).json({ message: "Passwords do not match." });
	}

	const existing = await User.findOne({ kickUsername });
	if (existing) return res.status(400).json({ message: "Username exists." });

	const hashed = await bcrypt.hash(password, 10);
	const newUser = new User({ kickUsername, password: hashed });
	await newUser.save();

	res.status(201).json({ message: "User registered." });
};

exports.login = async (req, res) => {
	const { kickUsername, password } = req.body;

	const user = await User.findOne({ kickUsername });
	if (!user) return res.status(404).json({ message: "User not found." });

	const match = await bcrypt.compare(password, user.password);
	if (!match) return res.status(401).json({ message: "Invalid credentials." });

	const token = jwt.sign(
		{ id: user._id, role: user.role },
		process.env.JWT_SECRET,
		{
			expiresIn: "7d",
		}
	);

	res.json({
		token,
		user: { id: user._id, kickUsername: user.kickUsername, role: user.role },
	});
};
