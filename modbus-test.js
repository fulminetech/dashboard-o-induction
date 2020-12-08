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
const mbsTimeout = 5000;
const slaveID = 1;
const baudRate = 115200;

// Modbus Addresses
const time_address = 4196;

const reg_address1 = 6396;
const coil_address1 = 6396;

const write_reg = 100
const write_coil = 100

//  Make physical connection MODBUS-RTU
var connectClient = function () {

    client.setID(slaveID);
    client.setTimeout(mbsTimeout);

    client.connectRTUBuffered("/dev/ttyUSB0", { baudRate: baudRate, parity: 'none' })
        .then(function () {
            // mbsState = MBS_STATE_GOOD_CONNECT;
            // machine.connection = true;
            console.log(`[ CONNECTED ]`)
            // console.log(`[ MODBUS TIMEOUT: ${timeOut} ]`);
            console.log(`[ BAUDRATE: ${baudRate} ]`);
        })
        .then(function () {
            runModbus()
        })
        .catch(function (e) {
            // mbsState = MBS_STATE_FAIL_CONNECT;
            console.log(`[ FAILED TO CONNECT ]`)
            console.log(e);
        });
}

connectClient()

setInterval(() => {

}, 2000);

var readRegs = function () {
    client.readHoldingRegisters(reg_address1, 8)
        .then(function (data) {
            console.log(data)
            // machine.rotation = data.data[0];
            // machine.step = data.data[1];
            // machine.delay = data.data[2];

            mbsState = MBS_STATE_GOOD_READ_REGS;
            // console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
        .catch(function (e) {
            console.error('[ #1 Regs Failed ]')
            // mbsState = MBS_STATE_FAIL_READ_REGS;
            // readfailed++;
            //console.log(`${(+ new Date() - startTime) / 1000} : ${mbsState}`)
        })
}

var readCoils = function () {
    client.readCoils(coil_address1, 45)
        .then(function (data) {
            console.log(data)
            // machine.start = data.data[0];
            // machine.stop = data.data[0];
            // machine.ready = data.data[0];

            // mbsState = MBS_STATE_GOOD_READ_COIL;
        })
        .catch(function (e) {
            console.error('[ #1 Coil Garbage ]')
            // mbsState = MBS_STATE_FAIL_READ_COIL;
            // readfailed++;
        })
}

var offset;
var set;

var writeReg = function () {

    client.writeRegisters(write_reg + offset, [set])
        .then(function (d) {
            console.log(`New value ${set}`);
            // mbsState = MBS_STATE_GOOD_WRITE_REGS;
        })
        .catch(function (e) {
            // mbsState = MBS_STATE_FAIL_WRITE_REGS;
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

