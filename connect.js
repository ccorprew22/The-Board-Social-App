var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "ccorprew",
  password: '',
  database: "message_system",
  multipleStatements: true
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

exports.conn = con;
