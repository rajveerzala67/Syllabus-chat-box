const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/syllabus-db';

  if (primaryUri) {
    try {
      const conn = await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 3000 });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      await seedUsers();
      return;
    } catch (error) {
      console.warn(`Primary Database Connection Warning (${error.message}). Switching to local fallback database...`);
    }
  }

  try {
    const conn = await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB Connected (Fallback): ${conn.connection.host}`);
    await seedUsers();
  } catch (fallbackErr) {
    console.error(`Fallback Database Connection Error: ${fallbackErr.message}`);
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
