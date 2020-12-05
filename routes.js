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

const {
    payload, watchproxy, startmodbus
} = require('./data.js')

// Serve NPM modules
app.use('/charts', express.static(__dirname + '/node_modules/chart.js/dist/'));
app.use('/charts/plugin', express.static(__dirname + '/node_modules/chartjs-plugin-zoom/'));
app.use('/plugin', express.static(__dirname + '/node_modules/hammerjs/'));
app.use('/css', express.static(__dirname + '/node_modules/tailwindcss/dist/'));
app.use('/font', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free/'));

const options = {
    inflate: true,
    limit: 1000,
    extended: true
};

app.use(bodyParser.urlencoded(options));

// Favicons 
app.get("/apple-touch-icon.png", (req, res) => {
    res.sendFile(path.join(__dirname + "/favicon_io/apple-touch-icon.png"));
});
app.get("/favicon-32x32.png", (req, res) => {
    res.sendFile(path.join(__dirname + "/favicon_io/favicon-32x32.png"));
});
app.get("/favicon-16x16.png", (req, res) => {
    res.sendFile(path.join(__dirname + "/favicon_io/favicon-16x16.png"));
});
app.get("/site.webmanifest", (req, res) => {
    res.sendFile(path.join(__dirname + "/favicon_io/site.webmanifest"));
});
app.get("/login/logo", (req, res) => {
    res.sendFile(path.join(__dirname + "/background.png"));
});
app.get("/login/image", (req, res) => {
    res.sendFile(path.join(__dirname + "/login.jpeg"));
});

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/html/index.html"));
});

app.get("/onboard", (req, res) => {
    res.sendFile(path.join(__dirname + "/html/onboard.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname + "/html/index.html"));
});

app.get("/control", (req, res) => {
    res.sendFile(path.join(__dirname + "/html/control.html"));
});

app.get("/reports", (req, res) => {
    res.sendFile(path.join(__dirname + "/html/reports.html"));
});

app.use("/api/payload", (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.json(payload);
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
const port = process.env.PORT || 6001;
app.listen(port, () => console.log(`Server running on port ${port} 🔥`));