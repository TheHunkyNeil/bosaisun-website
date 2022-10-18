const ADMIN_PASSWORD = "123456"; //password

const bcryptjs = require("bcryptjs");

const hashPassword = bcryptjs.hashSync(ADMIN_PASSWORD, 10);

console.log(hashPassword);

const isTrue = bcryptjs.compareSync(
  ADMIN_PASSWORD,
  "$2a$10$S1f/lxitVD.1uYW6YbCh.OBZYc/ejXXKamM31ePtRUylRjT.hQara"
);
console.log(isTrue);
