const path = require('path')
const express = require('express')
const app = express()
const port = 8080
app.use(express.static(__dirname + '/dist'))
app.use(function(req, res, next) {
  res.sendFile(path.resolve(__dirname + '/dist/index.html'));
});

app.listen(port);
console.log("Mvvm Vue starting on port: %d", port);
