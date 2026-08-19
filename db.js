const fs = require("fs");
const path = require("path");
const DB_PATH = path.join(__dirname, "data", "db.json");
function ensureFile(){const dir=path.dirname(DB_PATH);if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(DB_PATH))fs.writeFileSync(DB_PATH,JSON.stringify({businesses:[],leads:[],appointments:[]},null,2));}
function read(){ensureFile();return JSON.parse(fs.readFileSync(DB_PATH,"utf-8"));}
function write(data){ensureFile();fs.writeFileSync(DB_PATH,JSON.stringify(data,null,2));}
let queue=Promise.resolve();
function transact(fn){queue=queue.then(()=>{const data=read();const result=fn(data);write(data);return result;});return queue;}
module.exports={read,write,transact};
