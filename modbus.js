var ModbusRTU = require("modbus-serial");
const express = require("express");
const { exec } = require('child_process');
const restart1Command = "pm2 restart prod-modbus"

const app = express();

// Timestamp for which returns current date and time 
var noww = new Date().toLocaleString(undefined, { timeZone: 'Asia/Kolkata' });
console.log(`[ STARTING: ${noww} ]`)
var startTime = + new Date();

// Modbus RTU configs
var client = new ModbusRTU();
const timeOut = 500;
const slaveID = 1;
const baudRate = 115200;

// Modbus Addresses
const precompression_address = 6396;
const maincompression_address = 6196;
const ejection_address = 6296;
const avg_address = 6496;

const time_address = 4196;
const status_address = 2588;
const stats_address = 8096;

// Data Structure 
var machine = {
    status: 'ON',
    start: false,
    stop: false,
    ready: false,
    delay: 10,
    rotation: 10,
    step: 0,
    production: 0,
    temperature: 0
}

// Modbus 'state' constants
var MBS_STATE_INIT = "State init";
var MBS_STATE_GOOD_CONNECT = "State good (port)";
var MBS_STATE_FAIL_CONNECT = "State fail (port)";

var MBS_STATE_GOOD_READ_TIME = "State good time (read)";
var MBS_STATE_GOOD_READ_PRE = "State good pre (read)";

var MBS_STATE_FAIL_READ_TIME = "State fail time (read)";
var MBS_STATE_FAIL_READ_PRE = "State fail pre (read)";

var MBS_STATE_GOOD_WRITE_STATS = "State good stats (write)";
var MBS_STATE_GOOD_WRITE_STATUS = "State good status (write)";

var WRITE_STATUS
var WRITE_STATS

var mbsState = MBS_STATE_INIT;

var mbsTimeout = 5000;
var mbsScan = 200;

let readfailed = 0;
let failcounter = 100;

let timecheck = 3;
let timetemp = 0;

// Write Registers
var tablets_per_hour = 0;

//  Make physical connection MODBUS-RTU
var connectClient = function () {

    client.setID(slaveID);
    client.setTimeout(mbsTimeout);

    client.connectRTUBuffered("/dev/ttyUSB0", { baudRate: baudRate, parity: 'none' })
        .then(function () {
            mbsState = MBS_STATE_GOOD_CONNECT;

            console.log(`[ CONNECTED ]`)
            console.log(`[ MODBUS TIMEOUT: ${timeOut} ]`);
            console.log(`[ BAUDRATE: ${baudRate} ]`);
        })
        .then(function () {
            runModbus()
        })
        .catch(function (e) {
            mbsState = MBS_STATE_FAIL_CONNECT;
            console.log(`[ FAILED TO CONNECT ]`)
            console.log(e);
        });
}

connectClient()

// Sync Time from PLC
var syncplctime = function () {
    client.readHoldingRegisters(time_address, 6)
        .then(function (plcTime) {
            exec(`sudo timedatectl set-time '20${plcTime.data[2]}-${plcTime.data[1]}-${plcTime.data[0]} ${plcTime.data[3]}:${plcTime.data[4]}:${plcTime.data[5]}'`, (err, stdout, stderr) => {
                console.log(`[ Time updated! ]`)
            })
        })
        .then(function () {
            mbsState = MBS_STATE_GOOD_READ_TIME;
        })
        .catch(function (e) {
            timetemp++
            if (timetemp < timecheck) {
                mbsState = MBS_STATE_GOOD_CONNECT;
                console.log(mbsState)
            } else {
                console.log(mbsState)
                mbsState = MBS_STATE_FAIL_READ_TIME;
            }
        })
}

// Run MODBUS
var runModbus = function () {
    var nextAction;
    switch (mbsState) {
        case MBS_STATE_INIT:
            nextAction = connectClient;
            break;

        case MBS_STATE_GOOD_CONNECT:
            nextAction = syncplctime;
            break;

        case MBS_STATE_FAIL_CONNECT:
            nextAction = connectClient;
            break;
        
        case MBS_STATE_GOOD_READ_STATUS:
            nextAction = readstats;
            break;

        case MBS_STATE_GOOD_READ_STATS:
            nextAction = readpreLHS;
            break;

        case MBS_STATE_GOOD_WRITE_STATS || MBS_STATE_FAIL_WRITE_STATS:
            nextAction = readpreLHS;
            break;

        case MBS_STATE_GOOD_WRITE_STATUS || MBS_STATE_FAIL_WRITE_STATUS:
            nextAction = readpreLHS;
            break;

        default:
        // nothing to do, keep scanning until actionable case

    }

    //console.log();
    // console.log(nextAction);

    machine.stats.status = "ONLINE";

    if (readfailed > failcounter) {
        readfailed = 0;
        restartprodmodbus();
    }

    // execute "next action" function if defined
    if (nextAction !== undefined) {
        nextAction();
    } else {
        readpre();
    }

    // set for next run
    setTimeout(runModbus, mbsScan);
}

var readpre = function () {
    client.readHoldingRegisters(precompression_address, 8)
        .then(function (precompression) {
            payload.punch1.precompression = precompression.data[0] / 100;
            payload.punch2.precompression = precompression.data[1] / 100;
            payload.punch3.precompression = precompression.data[2] / 100;
            payload.punch4.precompression = precompression.data[3] / 100;
            payload.punch5.precompression = precompression.data[4] / 100;
            payload.punch6.precompression = precompression.data[5] / 100;
            payload.punch7.precompression = precompression.data[6] / 100;
            payload.punch8.precompression = precompression.data[7] / 100;

            mbsState = MBS_STATE_GOOD_READ_PRE;
            // console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
        .catch(function (e) {
            console.error('[ #1 Precompression Garbage ]')
            mbsState = MBS_STATE_FAIL_READ_PRE;
            readfailed++;
            //console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
}

var offset_stats;
var set_stats;

var writestats = function () {

    client.writeRegisters(stats_address + offset_stats, [set_stats])
        .then(function (d) {
            console.log(`New value ${set_stats}`);
            mbsState = MBS_STATE_GOOD_WRITE_STATS;
        })
        .catch(function (e) {
            mbsState = MBS_STATE_FAIL_WRITE_STATS;
            console.log(e.message);
        })
}

var writebutton = function () {

    client.writeCoil(button_address + offset_status, set_status)
        .then(function (d) {
            console.log(`Address ${status_address} set to ${set_status}`, d);
            mbsState = MBS_STATE_GOOD_WRITE_STATUS;
        })
        .catch(function (e) {
            console.log(e.message);
            mbsState = MBS_STATE_FAIL_WRITE_STATUS;
        })
}

function restartprodmodbus() {
    exec(restart1Command, (err, stdout, stderr) => {
        // handle err if you like!
        console.log(`[ RESTARTING: prod-modbus ]`);
        console.log(`${stdout}`);
    });
}

app.get("/set/status/:punch/:value", (req, res) => {
    const a = parseInt(req.params.punch);
    const b = req.params.value;

    offset_status = a - 1;
    if (b == 'true') {
        set_status = Boolean(true)
    } else if (b == 'false') {
        set_status = Boolean(false)
    }

    writestatus()

    res.header('Access-Control-Allow-Origin', '*');
    return res.json({ message: `[ UPDATED ${a} to ${b} ]` });
});

app.get("/set/:parameter/:value", (req, res) => {
    const a = req.params.parameter;
    const b = req.params.value;
    var c;

    if (a == "rpm") {
        offset_stats = 30
        set_stats = b
        c = payload.stats.rpm
        payload.stats.rpm = b;
        writestats()
    } else if (a == "feederLHS") {
        offset_stats = 31
        set_stats = b
        c = payload.stats.turretLHS
        payload.stats.turretLHS = b;
        writestats()
    } else if (a == "feederRHS") {
        offset_stats = 32
        set_stats = b
        c = payload.stats.turretRHS
        payload.stats.turretRHS = b;
        writestats()
    }
    else if (a == "pressure") {
        offset_stats = 34
        set_stats = b,
            c = payload.stats.pressure_set
        payload.stats.pressure_set = b;
        writestats()
    }
    else if (a == "lubetime") {
        offset_stats = 33
        set_stats = b
        c = payload.stats.lubetime_set
        payload.stats.lubetime_set = b;
        writestats()
    }
    else if (a == "machine" && b == "start") {
        offset_status = 15
        set_status = true
        writebutton()
        // payload.stats.lubetime_set = b;
    }
    else if (a == "machine" && b == "stop") {
        offset_status = 16
        set_status = false
        writebutton()
        // payload.stats.lubetime_set = b;
    }
    else if (a == "machine" && b == "inch") {
        offset_status = 10
        set_status = true // Toggle
        writebutton()
        // payload.stats.lubetime_set = b;
    }
    else if (a == "powerpack" && b == "start") {
        offset_status = 0
        set_status = true
        writebutton()
        // payload.stats.lubetime_set = b;
    }
    else if (a == "powerpack" && b == "stop") {
        offset_status = 1
        set_status = false
        writebutton()
        // payload.stats.lubetime_set = b;
    }
    else if (a == "powerpack" && b == "drain") {
        offset_status = 3
        set_status = true // Toggle
        writebutton()
        // payload.stats.lubetime_set = b;
    }

    res.header('Access-Control-Allow-Origin', '*');
    return res.json({ message: `[ UPDATED ${a} to ${b} ]` });
});


app.use("/api/payload", (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.json(payload);
});

// Start Server
const port = 3128;
app.listen(port, () => console.log(`Server running on port ${port} 🔥`));