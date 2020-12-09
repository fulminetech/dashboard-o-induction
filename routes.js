// Express imports
const express = require("express");
const bodyParser = require("body-parser");
const fs = require('fs').promises;
var path = require('path');
const app = express();
const CronJob = require('cron').CronJob;
const { exec } = require('child_process');
// const puppeteer = require('puppeteer');

const restartCommand = "pm2 restart prod-routes"
const restart1Command = "pm2 restart prod-modbus"

const rebootCommand = "sudo reboot -h now"

const host = "localhost"

// Serve NPM modules
app.use('/charts', express.static(__dirname + '/node_modules/chart.js/dist/'));
app.use('/charts/plugin', express.static(__dirname + '/node_modules/chartjs-plugin-zoom/'));
app.use('/plugin', express.static(__dirname + '/node_modules/hammerjs/'));
app.use('/css', express.static(__dirname + '/node_modules/tailwindcss/dist/'));
app.use('/font', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free/'));
app.use('/guage', express.static(__dirname + '/guage/'));

const options = {
    inflate: true,
    limit: 1000,
    extended: true
};

app.use(bodyParser.urlencoded(options));

// Routes
app.use('/env', express.static(__dirname + '/html/'));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/html/index.html"));
});

app.get("/restart/:what", (req, res) => {

    const a = req.params.what;

    if (a == "pm2-0") {
        res.json({ message: `[ RESTARTING: ${a} ]` });
        exec(restartCommand, (err, stdout, stderr) => {
            // handle err if you like!
            console.log(`[ RESTARTING: prod-routes ]`);
            console.log(`${stdout}`);
        });
    } else if (a == "pm2-1") {
        res.json({ message: `[ RESTARTING: ${a} ]` });
        exec(restart1Command, (err, stdout, stderr) => {
            // handle err if you like!
            console.log(`${stdout}`);
        });
    }
    else if (a == "device") {
        res.json({ message: `[ RESTARTING: PI ]` });
        exec(rebootCommand, (err, stdout, stderr) => {
            // handle err if you like!
            console.log(`${stdout}`);
        });
    }

})

// Start Server
const port = 8080;
app.listen(port, () => console.log(`Server running on port ${port} 🔥`));
