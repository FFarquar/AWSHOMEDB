const bcrypt = require('bcryptjs');
const hash = '$2a$10$41LxGGMMEn5YCk9VvPN/gOlOGxFyDnJfuAhAE/oNmxDPcOMHp3sWG';
['secret','password','Password1','welcome','admin','letmein','qwerty','changeme','test123','123456'].forEach(c => console.log(c, bcrypt.compareSync(c, hash)));
