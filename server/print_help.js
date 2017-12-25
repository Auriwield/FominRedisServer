const fs = require('fs');
module.exports = function () {
    return fs.readFileSync("./server/help.txt", "utf8");
};