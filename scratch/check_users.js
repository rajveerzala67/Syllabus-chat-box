const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const connectDB = require(path.join(__dirname, '../backend/config/db'));
const User = require(path.join(__dirname, '../backend/models/User'));

const check = async () => {
  try {
    await connectDB();
    const users = await User.find({});
    console.log('=== DB USERS LIST ===');
    users.forEach(u => {
      console.log(`Username: ${u.username} | Email: ${u.email} | Role: ${u.role}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

check();
