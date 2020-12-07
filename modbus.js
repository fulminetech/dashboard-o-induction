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
const time_address = 4196;

const reg_address1 = 6396;
const coil_address1 = 6396;

const write_reg = 100
const write_coil = 100

// Data Structure 
var machine = {
    connection: false,
    status: 'OFF',
    start: false,
    stop: false,
    ready: false,
    delay: 0,
    rotation: 0,
    step: 0,
    production: 0,
    temperature: 0
}

// Modbus 'state' constants
var MBS_STATE_INIT = "State init";
var MBS_STATE_GOOD_CONNECT = "State good (port)";
var MBS_STATE_FAIL_CONNECT = "State fail (port)";

var MBS_STATE_GOOD_READ_TIME = "State good time (read)";
var MBS_STATE_FAIL_READ_TIME = "State fail time (read)";

var MBS_STATE_GOOD_READ_REGS = "State good REGS (read)";
var MBS_STATE_FAIL_READ_REGS = "State fail REGS (read)";

var MBS_STATE_GOOD_READ_COIL = "State good COIL (read)";
var MBS_STATE_FAIL_READ_COIL = "State fail COIL (read)";

var MBS_STATE_GOOD_WRITE_REGS = "State good REGS (write)";
var MBS_STATE_FAIL_WRITE_REGS = "State fail REGS (write)";

var MBS_STATE_GOOD_WRITE_COIL = "State good COIL (write)";
var MBS_STATE_FAIL_WRITE_COIL = "State fail COIL (write)";

var MBS_WRITE_REG = "Write Register" 
var MBS_WRITE_COIL = "Write Coil" 

var mbsState = MBS_STATE_INIT;

var mbsTimeout = 5000;
var mbsScan = 200;

let readfailed = 0;
let failcounter = 100;

let timecheck = 3;
let timetemp = 0;

//  Make physical connection MODBUS-RTU
var connectClient = function () {

    client.setID(slaveID);
    client.setTimeout(mbsTimeout);

    client.connectRTUBuffered("/dev/ttyUSB0", { baudRate: baudRate, parity: 'none' })
        .then(function () {
            mbsState = MBS_STATE_GOOD_CONNECT;
            machine.connection = true;
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
            
        case MBS_STATE_FAIL_CONNECT:
            nextAction = connectClient;
            break;

        case MBS_STATE_GOOD_CONNECT:
            nextAction = syncplctime;
            break;
        
        case MBS_STATE_GOOD_READ_TIME || MBS_STATE_FAIL_READ_TIME:
            nextAction = readRegs;
            break;
        
        case MBS_STATE_GOOD_READ_REGS || MBS_STATE_FAIL_READ_REGS:
            nextAction = readCoils;
            break;

        case MBS_STATE_GOOD_READ_COIL || MBS_STATE_FAIL_READ_COIL:
            nextAction = readRegs;
            break;

        case MBS_WRITE_COIL:
            nextAction = writeCoil;
            break;
        
        case MBS_WRITE_REG:
            nextAction = writeReg;
            break;
        
        case MBS_STATE_GOOD_WRITE_REGS || MBS_STATE_FAIL_WRITE_REGS:
            nextAction = readRegs;
            break;
        
        case MBS_STATE_GOOD_WRITE_COIL || MBS_STATE_FAIL_WRITE_COIL:
            nextAction = readCoils;
            break;

        default:
        // nothing to do, keep scanning until actionable case

    }

    //console.log();
    // console.log(nextAction);

    if (readfailed > failcounter) {
        readfailed = 0;
        restartprodmodbus();
    }

    // execute "next action" function if defined
    if (nextAction !== undefined) {
        nextAction();
    } else {
        readRegs();
    }

    // set for next run
    setTimeout(runModbus, mbsScan);
}

var readRegs = function () {
    client.readHoldingRegisters(reg_address1, 8)
        .then(function (data) {
            machine.rotation = data.data[0];
            machine.step = data.data[1];
            machine.delay = data.data[2];

            mbsState = MBS_STATE_GOOD_READ_REGS;
            // console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
        .catch(function (e) {
            console.error('[ #1 Regs Failed ]')
            mbsState = MBS_STATE_FAIL_READ_REGS;
            readfailed++;
            //console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
}

var readCoils = function () {
    client.readCoils(coil_address1, 45)
        .then(function (data) {
            machine.start = data.data[0];
            machine.stop = data.data[0];
            machine.ready = data.data[0];

            mbsState = MBS_STATE_GOOD_READ_COIL;
        })
        .catch(function (e) {
            console.error('[ #1 Coil Garbage ]')
            mbsState = MBS_STATE_FAIL_READ_COIL;
            readfailed++;
        })
}

var offset;
var set;

var writeReg = function () {

    client.writeRegisters(write_reg + offset, [set])
        .then(function (d) {
            console.log(`New value ${set}`);
            mbsState = MBS_STATE_GOOD_WRITE_REGS;
        })
        .catch(function (e) {
            mbsState = MBS_STATE_FAIL_WRITE_REGS;
            console.log(e.message);
        })
}

var writeCoil = function () {

    client.writeCoil(write_coil + offset, set)
        .then(function (d) {
            console.log(`Address ${status_address} set to ${set}`, d);
            mbsState = MBS_STATE_GOOD_WRITE_COIL;
        })
        .catch(function (e) {
            console.log(e.message);
            mbsState = MBS_STATE_FAIL_WRITE_COIL;
        })
}

app.get("/set/:parameter/:value", (req, res) => {
    const a = req.params.parameter;
    const b = req.params.value;
    
    if (a == "start") {
        offset = 30
        set = b
        machine.start = b;
        machine.status = "ON";
        mbsState = MBS_WRITE_COIL;
    } else if (a == "stop") {
        offset = 31
        set = b
        machine.stop = b;
        machine.status = "STOPPED";
        mbsState = MBS_WRITE_COIL;
    } else if (a == "ready") {
        offset = 32
        set = b
        machine.ready = b;
        machine.status = "READY";
        mbsState = MBS_WRITE_COIL;
    } else if (a == "delay") {
        offset = 34
        set = b,
        machine.delay = b;
        mbsState = MBS_WRITE_REG;
    }
    
    res.header('Access-Control-Allow-Origin', '*');
    return res.json({ message: `[ UPDATED ${a} to ${b} ]` });
});

app.use("/api/machine", (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.json(machine);
});

function restartprodmodbus() {
    exec(restart1Command, (err, stdout, stderr) => {
        // handle err if you like!
        console.log(`[ RESTARTING: prod-modbus ]`);
        console.log(`${stdout}`);
    });
}

// Start Server
const port = 3128;
app.listen(port, () => console.log(`Server running on port ${port} 🔥`));