const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const connectDB = require(path.join(__dirname, '../backend/config/db'));
const Student = require(path.join(__dirname, '../backend/models/Student'));

const check = async () => {
  try {
    await connectDB();
    const students = await Student.find({});
    console.log('=== STUDENTS IN COLLECTION ===');
    students.forEach(s => {
      console.log(`Name: ${s.fullName} | Enrollment: ${s.enrollmentNumber} | NFC: ${s.nfcTagNumber} | Sem: ${s.semester} | Div: ${s.division} | Email: ${s.email} | userId: ${s.userId}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

check();
