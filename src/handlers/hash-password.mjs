import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'change-me';

console.log(bcrypt.hashSync(password, 10));
