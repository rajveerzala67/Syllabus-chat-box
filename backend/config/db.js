const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/syllabus-db';
  const fallbackUri = 'mongodb://127.0.0.1:27017/syllabus-db';

  try {
    const conn = await mongoose.connect(primaryUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedUsers();
  } catch (error) {
    console.error(`Primary Database Connection Warning: ${error.message}`);
    if (primaryUri !== fallbackUri) {
      try {
        console.log(`Attempting fallback local MongoDB connection: ${fallbackUri}...`);
        const conn = await mongoose.connect(fallbackUri);
        console.log(`MongoDB Connected (Fallback): ${conn.connection.host}`);
        await seedUsers();
        return;
      } catch (fallbackErr) {
        console.error(`Fallback Database Connection Error: ${fallbackErr.message}`);
      }
    }
    console.error('Server running in standalone mode (Database connection failed). Server will remain active.');
  }
};

const seedUsers = async () => {
  try {
    const silveroakExists = await User.findOne({ username: 'silveroak' });
    if (!silveroakExists) {
      await User.create({
        username: 'silveroak',
        email: 'silveroak@gmail.com',
        password: '12345',
        role: 'coordinator'
      });
      console.log('Seeded coordinator user: silveroak');
    } else if (!silveroakExists.email) {
      silveroakExists.email = 'silveroak@gmail.com';
      await silveroakExists.save();
    }

    const rajveerExists = await User.findOne({ username: 'rajveer' });
    if (!rajveerExists) {
      await User.create({
        username: 'rajveer',
        email: 'rajveerzala953@gmail.com',
        password: '12345',
        role: 'student'
      });
      console.log('Seeded student user: rajveer');
    } else if (!rajveerExists.email) {
      rajveerExists.email = 'rajveerzala953@gmail.com';
      await rajveerExists.save();
    }
  } catch (error) {
    console.error(`Error seeding users: ${error.message}`);
  }
};

module.exports = connectDB;
