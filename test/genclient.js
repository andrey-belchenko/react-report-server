require('colors');
let cg = require("../client-generator");
var fileName = 'test/gcresult.txt';

cg.generate(fileName).then(() => {
    console.log(('report API client generated: ' + fileName).green);
    process.exit();
});