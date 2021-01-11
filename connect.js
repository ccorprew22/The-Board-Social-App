var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "",
  password: '',
  database: "",
  multipleStatements: true
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

exports.conn = con;
