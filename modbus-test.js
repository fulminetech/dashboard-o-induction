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
const baudRate = 9600;

// Modbus Addresses
const time_address = 4196;

const vfd1_status_monitor = 8448 // 2100H

const vfd1_mode_address = 8192 // 2000H
const vfd1_freq_address = 8193 // 2001H

// HEX to decimal: https://www.rapidtables.com/convert/number/hex-to-decimal.html?x=2001
const vfd1_forward_stop = 17 // 0000000000100001 
const vfd1_forward_run = 18 // 0000000000010010 
const vfd1_forward_jog = 19 // 0000000000010011

const vfd1_reverse_stop = 33 // 0000000000100001
const vfd1_reverse_run = 34 // 0000000000100010
const vfd1_reverse_jog = 35 // 0000000000100011

const reg_address1 = 6396;
const coil_address1 = 6396;



const write_reg = 100
const write_coil = 100

//  Make physical connection MODBUS-RTU
var connectClient = function () {

    client.setID(slaveID);
    client.setTimeout(mbsTimeout);

    client.connectRTUBuffered("/dev/tty.usbserial-A50285BI", { baudRate: baudRate, parity: 'even' })
        .then(function () {
            // mbsState = MBS_STATE_GOOD_CONNECT;
            // machine.connection = true;
            console.log(`[ CONNECTED ]`)
            // console.log(`[ MODBUS TIMEOUT: ${timeOut} ]`);
            console.log(`[ BAUDRATE: ${baudRate} ]`);
        })
        .then(function () {
            writeReg()
            // readRegs()
            // runModbus()
        })
        .catch(function (e) {
            // mbsState = MBS_STATE_FAIL_CONNECT;
            console.log(`[ FAILED TO CONNECT ]`)
            console.log(e);
        });
}

connectClient()

setInterval(() => {
    readRegs()
}, 2000);

var readRegs = function () {
    client.readHoldingRegisters(vfd1_status_monitor, 11)
        .then(function (data) {
            console.log('Status:',data.data[1])
            console.log('Frequency Command:',data.data[2])
            console.log('Output Frequency:',data.data[3])
            console.log('Output Current:',data.data[4])
            console.log('DC Bus Voltage:',data.data[5])
            console.log('Operation Time:',data.data[9])
            console.log('Counter Value:',data.data[9])

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


var writeReg = function () {

    client.writeRegister(vfd1_mode_address, vfd1_forward_jog)
        .then(function (d) {
            console.log(`New value ${set}`);
            // mbsState = MBS_STATE_GOOD_WRITE_REGS;
        })
        .catch(function (e) {
            // mbsState = MBS_STATE_FAIL_WRITE_REGS;
            console.log(e.message);
        })
    
    setTimeout(() => {
        client.writeRegister(vfd1_mode_address, vfd1_forward_stop)
            .then(function (d) {
                console.log(`New value ${set}`);
                // mbsState = MBS_STATE_GOOD_WRITE_REGS;
            })
            .catch(function (e) {
                // mbsState = MBS_STATE_FAIL_WRITE_REGS;
                console.log(e.message);
            })
    }, 9500);
    
    // setTimeout(() => {
    //     client.writeRegister(vfd1_mode_address, vfd1_reverse_run)
    //         .then(function (d) {
    //             console.log(`New value ${set}`);
    //             // mbsState = MBS_STATE_GOOD_WRITE_REGS;
    //         })
    //         .catch(function (e) {
    //             // mbsState = MBS_STATE_FAIL_WRITE_REGS;
    //             console.log(e.message);
    //         })
    // }, 14500);
    
    // setTimeout(() => {
    //     client.writeRegister(vfd1_mode_address, vfd1_reverse_stop)
    //         .then(function (d) {
    //             console.log(`New value ${set}`);
    //             // mbsState = MBS_STATE_GOOD_WRITE_REGS;
    //         })
    //         .catch(function (e) {
    //             // mbsState = MBS_STATE_FAIL_WRITE_REGS;
    //             console.log(e.message);
    //         })
    // }, 20500);
}

var freq;

var writeFreq = function () {

    client.writeRegister(vfd1_freq_address, freq)
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

