const fs = require('fs');
module.exports = function () {
    return fs.readFileSync("./help.txt", "utf8");
};