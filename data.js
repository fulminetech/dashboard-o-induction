// Include Library
const fetch = require('cross-fetch');
const { exec } = require('child_process');
const CronJob = require('cron').CronJob;

// const Gpio = require('onoff').Gpio;
// const proxy = new Gpio(26, 'in', 'falling', { debounceTimeout: 10 });

var host = "http://localhost"; 
var os = require("os");
var hostname = os.networkInterfaces()
//var ip_address_wifi = hostname.wlan0[0].address;
//var ip_address_4G = hostname.ppp0[0].address;
// var ip_address = hostname.ppp0[0].address;

// if (ip_address == "10.0.0.65") {
//     host = "http://localhost"
// } else {
//     host = "https://localhost"
// }
    
//console.log(ip_address)

const Influx = require('influxdb-nodejs');
const flux = new Influx(`${host}:8086/new`);

// Timestamp for which returns current date and time 
var noww = new Date().toLocaleString(undefined, { timeZone: 'Asia/Kolkata' });
console.log(`[ STARTING INFLUX : ${noww} ]`)

const payloadURL = `${host}:3128/api/payload`;

var payload = {
    status: "ONLINE",
    production: {
        startTime: "Loading",
        productionCount: 0,
        rejectionCount: 0,
        rotationCount: 0,
        productionPerHour: 0,
        turretRPM: 0,
        temperature: 0,
        currentProcess: "LOAD",
        currentStatus: "OK"
    },
    set: {
        power: false,
        delayTime: 0,
    },
    trip: {
        trip1: false,
        trip2: false,
        trip3: false,
    }
}

function startmodbus() {
    setInterval(() => {
        fetchpayload()
    }, 100);
}

async function fetchpayload() {
    // const res = await fetch(payloadURL);
    // const res1 = await fetch(machineURL);

    fetch(payloadURL)
        .then(res => {
            if (res.status >= 400) {
                throw new Error("Bad response from server");
            }
            return res.json();
        })
        .then(data => {

            payload1 = data;

            // payload.present_punch = payload1.present_punch;
            // payload.punch1.precompression = payload1.punch1.precompression;
            // payload.punch1.maincompression = payload1.punch1.maincompression;
            // payload.punch1.ejection = payload1.punch1.ejection;
            // payload.punch1.status = payload1.punch1.status;

            // payload.punch2.precompression = payload1.punch2.precompression;
            // payload.punch2.maincompression = payload1.punch2.maincompression;
            // payload.punch2.ejection = payload1.punch2.ejection;
            // payload.punch2.status = payload1.punch2.status;

            // payload.punch3.precompression = payload1.punch3.precompression;
            // payload.punch3.maincompression = payload1.punch3.maincompression;
            // payload.punch3.ejection = payload1.punch3.ejection;
            // payload.punch3.status = payload1.punch3.status;

            // payload.punch4.precompression = payload1.punch4.precompression;
            // payload.punch4.maincompression = payload1.punch4.maincompression;
            // payload.punch4.ejection = payload1.punch4.ejection;
            // payload.punch4.status = payload1.punch4.status;

            // payload.punch5.precompression = payload1.punch5.precompression;
            // payload.punch5.maincompression = payload1.punch5.maincompression;
            // payload.punch5.ejection = payload1.punch5.ejection;
            // payload.punch5.status = payload1.punch5.status;

            // payload.punch6.precompression = payload1.punch6.precompression;
            // payload.punch6.maincompression = payload1.punch6.maincompression;
            // payload.punch6.ejection = payload1.punch6.ejection;
            // payload.punch6.status = payload1.punch6.status

            // payload.punch7.precompression = payload1.punch7.precompression;
            // payload.punch7.maincompression = payload1.punch7.maincompression;
            // payload.punch7.ejection = payload1.punch7.ejection;
            // payload.punch7.status = payload1.punch7.status;

            // payload.punch8.precompression = payload1.punch8.precompression;
            // payload.punch8.maincompression = payload1.punch8.maincompression;
            // payload.punch8.ejection = payload1.punch8.ejection;
            // payload.punch8.status = payload1.punch8.status;

            // payload.precompression_avg = payload1.precompression_avg;
            // payload.maincompression_avg = payload1.maincompression_avg;
            // payload.ejection_avg = payload1.ejection_avg;
        })
        .catch(err => {
            console.error("[ MODBUS SERVER OFFLINE ]");
        });

};

// --+++=== DATABASE WRITE ===+++-- //
// Initialise Rotation 
var rotation = -1;

// Field and tag schema for Influx write
const payloadFieldSchema = {
    rotation: 'i',
    p1pre: 'f',
    p2pre: 'f',
    p3pre: 'f',
    p4pre: 'f',
    p5pre: 'f',
    p6pre: 'f',
    p7pre: 'f',
    p8pre: 'f',
    p8pre: 'f',
    p1main: 'f',
    p2main: 'f',
    p3main: 'f',
    p4main: 'f',
    p5main: 'f',
    p6main: 'f',
    p7main: 'f',
    p8main: 'f',
    p8main: 'f',
    p1ejn: 'f',
    p2ejn: 'f',
    p3ejn: 'f',
    p4ejn: 'f',
    p5ejn: 'f',
    p6ejn: 'f',
    p7ejn: 'f',
    p8ejn: 'f',
    p8ejn: 'f',
    preavg: 'f',
    mainavg: 'f',
    ejnavg: 'f',
    p1status: 'b',
    p2status: 'b',
    p3status: 'b',
    p4status: 'b',
    p5status: 'b',
    p6status: 'b',
    p7status: 'b',
    p8status: 'b',
    p8status: 'b',
};

const payloadTagSchema = {

};

// Updated with each rotation
writePayload = () => {
    flux.write(`${payload.batch}.payload`)
        .tag({
        })
        .field({
            batch: payload.batch,
            ejnavg: payload.ejection_avg,
            mainavg: payload.maincompression_avg,

            p1ejn: payload.punch1.precompression,
            p1main: payload.punch1.maincompression,
            p1pre: payload.punch1.ejection,
            p1status: payload.punch1.status,

            p2ejn: payload.punch2.precompression,
            p2main: payload.punch2.maincompression,
            p2pre: payload.punch2.ejection,
            p2status: payload.punch2.status,

            p3ejn: payload.punch3.precompression,
            p3main: payload.punch3.maincompression,
            p3pre: payload.punch3.ejection,
            p3status: payload.punch3.status,

            p4ejn: payload.punch4.precompression,
            p4main: payload.punch4.maincompression,
            p4pre: payload.punch4.ejection,
            p4status: payload.punch4.status,

            p5ejn: payload.punch5.precompression,
            p5main: payload.punch5.maincompression,
            p5pre: payload.punch5.ejection,
            p5status: payload.punch5.status,

            p6ejn: payload.punch6.precompression,
            p6main: payload.punch6.maincompression,
            p6pre: payload.punch6.ejection,
            p6status: payload.punch6.status,

            p7ejn: payload.punch7.precompression,
            p7main: payload.punch7.maincompression,
            p7pre: payload.punch7.ejection,
            p7status: payload.punch7.status,

            p8ejn: payload.punch8.precompression,
            p8main: payload.punch8.maincompression,
            p8pre: payload.punch8.ejection,
            p8status: payload.punch8.status,

            preavg: payload.precompression_avg,
            rotation: payload.rotation_no,
        })
        .then(() => console.info(`[ PAYLOAD WRITE SUCESSFUL ${payload.rotation_no} ]`))
        .catch(console.error);
}

// write every 10 mins
writemachine = () => {
    setTimeout(() => {
        fluxmachine();
    }, 2000);
    setInterval(() => {
        fluxmachine();
    }, 600000);
};

fluxmachine = () => {
    flux.write(`${payload.batch}.machine`)
        .tag({
        })
        .field({
            operatorname: machine.operator_name,
            machineID: machine.machine_id,
            mcUpperLimit: machine.maincompression_upperlimit,
            mcLowerLimit: machine.maincompression_lowerlimit,
            pcUpperLimit: machine.precompression_upperlimit,
            pcLowerLimit: machine.precompression_lowerlimit,
            ejnUpperLimit: machine.ejection_upperlimit,
            recipieID: machine.product.recipie_id,
            productionCount: machine.stats.count,
            productionPerHour: machine.stats.tablets_per_hour,
            rpm: machine.stats.rpm,
        })
        .then(() => console.info(`[ MACHINE WRITE SUCESSFUL ${noww} ]`))
        .catch(console.error);
};

// var watchproxy = function () {
//     writemachine();
//     proxy.watch((err, value) => {
//         if (err) {
//             throw err;
//         }
//         machine.stats.status = "ONLINE";
//         payload.rotation_no++;
//         writePayload();
//     });
// }

module.exports = {
    payload, startmodbus
}

