const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const connectDB = require(path.join(__dirname, '../backend/config/db'));
const User = require(path.join(__dirname, '../backend/models/User'));

const fixPassword = async () => {
  try {
    await connectDB();
    const user = await User.findOne({ username: 'teacher1' });
    if (user) {
      user.password = '123456';
      user.mustChangePassword = false;
      await user.save();
      console.log('Successfully updated teacher1 password to: 123456');
    } else {
      console.log('teacher1 not found, creating teacher1...');
      await User.create({
        username: 'teacher1',
        email: 'teacher1@gmail.com',
        password: '123456',
        role: 'teacher',
        mustChangePassword: false
      });
      console.log('Successfully created teacher1 with password: 123456');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixPassword();
