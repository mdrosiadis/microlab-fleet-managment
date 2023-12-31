// make all canvas objects not selectable by default
fabric.Object.prototype.selectable = false;

// compute canvas size
const map_area = document.querySelector("#map-area");
const maw = map_area.clientWidth;
const mah = map_area.clientHeight;

const status_img = document.getElementById("status-image");
console.log({maw, mah});
// initialize fabric.js canvas
const canvas_dom = document.querySelector("#map-canvas");
canvas_dom.setAttribute("width", maw);
canvas_dom.setAttribute("height", mah);
const canvas = new fabric.Canvas('map-canvas', {width: maw, height: mah});
// finetune view matrix
canvas.viewportTransform[4] = canvas.width / 2;
canvas.viewportTransform[5] = canvas.height / 2;
canvas.viewportTransform[0] = 0.5;
canvas.viewportTransform[3] = 0.5;

// var lines = new fabric.Group({
//     selectable: false,
//     evented: false
// });
// canvas.add(lines);

var lines = []

var circle = new fabric.Circle({
    top: 0,
    left: 0,
    radius: 5,
    selectable: false,
    evented: false
});
canvas.add(circle);

const robot = new fabric.Triangle({
    top: 0,
    left: 0,
    width: 60,
    height: 70,
    angle: 0,
    fill: 'black',
    originX: "center",
    originY: "center",
    stroke: "red",
    strokeWidth: 5,
    selectable: false,
    evented: false
});
canvas.add(robot);

// set up zooming 
canvas.on('mouse:wheel', function(opt) {
  var delta = opt.e.deltaY;
  var zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;
  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});

// handle panning
var panning = false;
canvas.on('mouse:up', function (e) {
    panning = false;
});

canvas.on('mouse:down', function (e) {
    panning = true;
});
canvas.on('mouse:move', function (e) {
    if (panning && e && e.e) {
        var units = 10;
        var delta = new fabric.Point(e.e.movementX, e.e.movementY);
        canvas.relativePan(delta);
    }
});

var socket = io();
let timeout;
let statusb = false;
let lastPosX;
let lastPosY;
let PosX;
let PosY;

let lastDataTimestamp = Date.now();


socket.on('connect', function() {
    console.log("connected");
    interv = setInterval(timedOutFunc, 1500);
});

socket.on('data', function(data) {
    PosX = data['position'][0]; 
    PosY = -data['position'][1];

    lastDataTimestamp = Date.now();
    robot.set({
        left: PosX,
        top: PosY
    });


    if(Math.hypot(PosX - lastPosX, PosY-lastPosY) > 3) {
        var line = new fabric.Line([lastPosX, lastPosY,PosX, PosY], {
            stroke: 'black',
            strokeWidth: 4,
            selectable: false,
            evented: false
        });
        canvas.add(line);
        lines.push(line);
    }

    lastPosX = PosX;
    lastPosY = PosY;

    robot.rotate(-data['heading'] + 90);
    canvas.renderAll();

    document.getElementById("l-motor-sp").innerHTML = data["left_motor_speed"];
    document.getElementById("l-motor-st").innerHTML = data["left_motor_state"];
    document.getElementById("r-motor-sp").innerHTML = data["right_motor_speed"];
    document.getElementById("r-motor-st").innerHTML = data["right_motor_state"];
    document.getElementById("voltage-sp").innerHTML = data["voltage"];
    document.getElementById("coords-sp").innerHTML = (`X: ${Math.round(PosX)}  Y: ${Math.round(PosY)}`);

});

const socketc = io.connect();


// send data on click
canvas.on("mouse:dblclick", (event) => {
    var pointer = canvas.getPointer(event);
    socketc.emit('coords', pointer);
});

function timedOutFunc() {
    const diff = Date.now() - lastDataTimestamp;
    if(diff > 1500) {
        status_img.src="../static/images/offline.png";
        statusb = false;

        lastPosX = undefined;
        lastPosY = undefined;

        document.getElementById("l-motor-sp").innerHTML = "N/A";
        document.getElementById("l-motor-st").innerHTML = "N/A";
        document.getElementById("r-motor-sp").innerHTML = "N/A";
        document.getElementById("r-motor-st").innerHTML = "N/A";
        document.getElementById("voltage-sp").innerHTML = "N/A";
        document.getElementById("coords-sp").innerHTML = "X: N/A Y: N/A";
    }
    else {
        status_img.src="../static/images/online.png";
    }
}



document.getElementById('clear-p-route').onclick = function() {
    lines.forEach(l => canvas.remove(l));
    lines._objects.length = 0;
    canvas.renderAll();
};

document.getElementById('clear-n-route').onclick = function() {
    socketc.emit("clear");
};

document.getElementById('pause-b').onclick = function() {
    socketc.emit("pause");
};

document.getElementById('resume-b').onclick = function() {
    socketc.emit("resume");
};

async function getmap() {
    const response = await fetch("/getmap");
    var polygons = await response.json();

    fjs_polys = polygons.map((ar) => {
        // console.log(ar);
        const points = ar.map(xy => ({x: xy[0], y: -xy[1]}));
        console.log(points);

        var polygon = new fabric.Polygon(points, {
            fill: 'green',
            selectable: false,
            evented: false
        });
      
        canvas.add(polygon);
        
    });

    canvas.renderAll();
}

getmap();