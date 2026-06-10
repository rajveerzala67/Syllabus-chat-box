const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/syllabus-db');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Seed legacy users if they don't exist
    await seedUsers();
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Check if silveroak coordinator exists
    const silveroakExists = await User.findOne({ username: 'silveroak' });
    if (!silveroakExists) {
      await User.create({
        username: 'silveroak',
        password: '12345',
        role: 'coordinator'
      });
      console.log('Seeded coordinator user: silveroak');
    }

    // Check if rajveer student exists
    const rajveerExists = await User.findOne({ username: 'rajveer' });
    if (!rajveerExists) {
      await User.create({
        username: 'rajveer',
        password: '12345',
        role: 'student'
      });
      console.log('Seeded student user: rajveer');
    }
  } catch (error) {
    console.error(`Error seeding users: ${error.message}`);
  }
};

module.exports = connectDB;
