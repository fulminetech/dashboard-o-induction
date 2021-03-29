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

const Gpio = require('onoff').Gpio;

const machine_start = new Gpio(17, 'out')
const machine_stop = new Gpio(17, 'out')

machine_start.writeSync(value); // Value 0/1

const retpump_start = new Gpio(17, 'out')
const retpump_stop = new Gpio(17, 'out')

const qpump_start = new Gpio(17, 'out')
const qpump_stop = new Gpio(17, 'out')

// console.log("Testing proxy")

// var data_number = 0

// proxy.watch((err, value) => {
//     if (err) {
//         throw err;
//     }
//     data_number++;
//     console.log(`Data: ${data_number}`)
    
// });

// Modbus Addresses
// const time_address = 4196;

const read_reg = 4596; // Index Number
const read_reg1 = 5126; // Pulses
const read_reg2 = 4496; // Heating Time

const read_coil = 2198; // Start, Stop, Home

const vfd1_mode_address = 8192 // 2000H
const vfd1_freq_address = 8193 // 2001H

// HEX to decimal: https://www.rapidtables.com/convert/number/hex-to-decimal.html?x=2001
const vfd1_forward_stop = 17 // 0000000000100001 
const vfd1_forward_run = 18 // 0000000000010010 
const vfd1_forward_jog = 19 // 0000000000010011

const vfd1_reverse_stop = 33 // 0000000000100001
const vfd1_reverse_run = 34 // 0000000000100010
const vfd1_reverse_jog = 35 // 0000000000100011

// Data Structure 
var machine = {
    connection: false,
    status: 'OFF',
    start: false,
    stop: false,
    home: false,
    heating_time: 0,
    index: 0,
    pulse: 0,
    production: 0,
    temperature: 0
}

// Modbus 'state' constants
var MBS_STATE_INIT = "State init";
var MBS_STATE_GOOD_CONNECT = "State good (port)";
var MBS_STATE_FAIL_CONNECT = "State fail (port)";

var MBS_STATE_GOOD_READ_TIME = "State good time (read)";
var MBS_STATE_FAIL_READ_TIME = "State fail time (read)";

var MBS_STATE_GOOD_READ_REGS1 = "State good REGS 1 (read)";
var MBS_STATE_GOOD_READ_REGS2 = "State good REGS 2 (read)";
var MBS_STATE_GOOD_READ_REGS3 = "State good REGS 3 (read)";
var MBS_STATE_FAIL_READ_REGS1 = "State fail REGS 1 (read)";
var MBS_STATE_FAIL_READ_REGS2 = "State fail REGS 2 (read)";
var MBS_STATE_FAIL_READ_REGS3 = "State fail REGS 3 (read)";

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
var mbsScan = 1000;

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
            machine.connection = false;
            console.log(`[ FAILED TO CONNECT ]`)
            console.log(e);
        });
}

connectClient()

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
            nextAction = readRegs1;
            break;
        
        // case MBS_STATE_GOOD_READ_TIME || MBS_STATE_FAIL_READ_TIME:
        //     nextAction = readRegs1;
        //     break;
        
        case MBS_STATE_GOOD_READ_REGS1 || MBS_STATE_FAIL_READ_REGS1:
            nextAction = readRegs2;
            break;
        
        case MBS_STATE_GOOD_READ_REGS2 || MBS_STATE_FAIL_READ_REGS2:
            nextAction = readRegs3;
            break;
        
        case MBS_STATE_GOOD_READ_REGS3 || MBS_STATE_FAIL_READ_REGS3:
            nextAction = readCoils;
            break;

        case MBS_STATE_GOOD_READ_COIL || MBS_STATE_FAIL_READ_COIL:
            nextAction = readRegs1;
            break;

        case MBS_WRITE_COIL:
            nextAction = writeCoil;
            break;
        
        case MBS_WRITE_REG:
            nextAction = writeReg;
            break;
        
        case MBS_STATE_GOOD_WRITE_REGS || MBS_STATE_FAIL_WRITE_REGS:
            nextAction = readRegs1;
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
        // restartprodmodbus();
    }

    // execute "next action" function if defined
    if (nextAction !== undefined) {
        nextAction();
    } else {
        readRegs1();
    }

    // set for next run
    setTimeout(runModbus, mbsScan);
}

var readRegs1 = function () {
    client.readHoldingRegisters(read_reg, 1)
        .then(function (data) {
            console.log(`Index No: ${data.data[0]}`)
            machine.index = data.data[0]

            mbsState = MBS_STATE_GOOD_READ_REGS1;
            // console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
        .catch(function (e) {
            console.error('[ #1 Regs Failed ]')
            mbsState = MBS_STATE_FAIL_READ_REGS1;
            readfailed++;
            //console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
}

var readRegs2 = function () {
    
    client.readHoldingRegisters(read_reg1, 1)
        .then(function (data) {
            console.log(`Pulse No: ${data.data[0]}`)
            machine.pulse = data.data[0];
            
            mbsState = MBS_STATE_GOOD_READ_REGS2;
            // console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
        .catch(function (e) {
            console.error('[ #2 Regs Failed ]')
            mbsState = MBS_STATE_FAIL_READ_REGS2;
            readfailed++;
            //console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
    
}
var readRegs3 = function () {
    client.readHoldingRegisters(read_reg2, 1)
        .then(function (data) {
            console.log(`Heating Time: ${data.data[0]}`)
            machine.heating_time = data.data[0];
            
            mbsState = MBS_STATE_GOOD_READ_REGS3;
            // console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
        .catch(function (e) {
            console.error('[ #3 Regs Failed ]')
            mbsState = MBS_STATE_FAIL_READ_REGS3;
            readfailed++;
            //console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
}

var readCoils = function () {
    client.readCoils(read_coil, 3)
        .then(function (data) {
            console.log(data)
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

var address;
var set;

var writeReg = function () {

    client.writeRegisters(address, [set])
        .then(function (d) {
            console.log(`Address ${address} set to ${set}`);
            mbsState = MBS_STATE_GOOD_WRITE_REGS;
        })
        .catch(function (e) {
            mbsState = MBS_STATE_FAIL_WRITE_REGS;
            console.log(e.message);
        })

}

var writeCoil = function () {

    client.writeCoil(address, set)
        .then(function (d) {
            console.log(`Address ${address} set to ${set}`);
            mbsState = MBS_STATE_GOOD_WRITE_COIL;
        })
        .catch(function (e) {
            console.log(e.message);
            mbsState = MBS_STATE_FAIL_WRITE_COIL;
        })
    
    setTimeout(() => {
        client.writeCoil(address, !set)
            .then(function (d) {
                console.log(`Address ${address} reset to ${!set}`);
                mbsState = MBS_STATE_GOOD_WRITE_COIL;
            })
            .catch(function (e) {
                console.log(e.message);
                mbsState = MBS_STATE_FAIL_WRITE_COIL;
            })
    }, 50);
}

app.get("/set/:parameter/:value", (req, res) => {
    const a = req.params.parameter;
    const b = req.params.value;
    
    if (a == "vfd1_freq") {
        address = vfd1_freq_address
        set = parseInt(b * 100)
        mbsState = MBS_WRITE_REG;
    } else if (a == "vfd1_forward_run") {
        address = vfd1_mode_address
        set = vfd1_forward_run
        mbsState = MBS_WRITE_REG;
    } else if (a == "vfd1_forward_stop") {
        address = vfd1_mode_address
        set = vfd1_forward_stop
        mbsState = MBS_WRITE_REG;
    } else if (a == "vfd1_forward_jog") {
        address = vfd1_mode_address
        set = vfd1_forward_jog
        mbsState = MBS_WRITE_REG;
    } else if (a == "vfd1_reverse_stop") {
        address = vfd1_mode_address
        set = vfd1_reverse_stop
        mbsState = MBS_WRITE_REG;
    } else if (a == "vfd1_reverse_run") {
        address = vfd1_mode_address
        set = vfd1_reverse_run
        mbsState = MBS_WRITE_REG;
    } else if (a == "vfd1_reverse_jog") {
        address = vfd1_mode_address
        set = vfd1_reverse_jog
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