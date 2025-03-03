const jwt = require('jsonwebtoken');
const User = require('../backend/models/User');
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

exports.getUser = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token is missing' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ id: user._id, email: user.email });
  } catch (err) {
    console.error('❌ Error fetching user data:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.addUserData = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token is missing' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newData = req.body.newData;
    if (!newData || !newData.sensorId || !newData.timestamp) {
      return res.status(400).json({ message: 'Invalid or missing data' });
    }

    const isDuplicate = user.data.some(
      (item) => item.sensorId === newData.sensorId && item.timestamp === newData.timestamp
    );

    if (isDuplicate) {
      return res.status(409).json({ message: 'Duplicate data entry detected' });
    }

    user.data.push(newData);
    await user.save();
    res.status(200).json({ message: 'Data added successfully', data: user.data });
  } catch (err) {
    console.error('❌ Error adding user data:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getUserData = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token is missing' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ data: user.data });
  } catch (err) {
    console.error('❌ Error fetching user data:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};