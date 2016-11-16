//Box object to hold data for all drawn rects
function Box() {
  this.x = 0;
  this.y = 0;
  this.w = 1; // default width and height?
  this.h = 1;
  this.fill = '#444444';
}

var infoBox = document.querySelector('.moveable');
displace(infoBox);

var input1_x = document.querySelector('#point1_x');
var input1_y = document.querySelector('#point1_y');
var input2_x = document.querySelector('#point2_x');
var input2_y = document.querySelector('#point2_y');
var angle = document.querySelector('#angle');
var distance = document.querySelector('#distance');

var measureBox = document.querySelector('#measureWindow');

//Initialize a new Box, add it, and invalidate the canvas
function addRect(x, y, w, h, fill) {
  var rect = new Box;
  rect.x = x;
  rect.y = y;
  rect.w = w
  rect.h = h;
  rect.fill = fill;
  boxes.push(rect);
  invalidate();
}

// holds all our rectangles
var boxes = []; 
var line;
var canvas;
var ctx;
var WIDTH;
var HEIGHT;
var INTERVAL = 20;  // how often, in milliseconds, we check to see if a redraw is needed

var isDrag = false;
var isHover = false;
var mx, my; // mouse coordinates

 // when set to true, the canvas will redraw everything
 // invalidate() just sets this to false right now
 // we want to call invalidate() whenever we make a change
var canvasValid = false;

// The node (if any) being selected.
// If in the future we want to select multiple objects, this will get turned into an array
var mySel; 
var myHov;

// The selection color and width. Right now we have a red selection with a small width
var mySelColor = '#CC0000';
var mySelWidth = 2;

var myHoverColor = 'purple';
var myHoverWidth = 2;

// we use a fake canvas to draw individual shapes for selection testing
var ghostcanvas;
var gctx; // fake canvas context

// since we can drag from anywhere in a node
// instead of just its x/y corner, we need to save
// the offset of the mouse when we start dragging.
var offsetx, offsety;

// Padding and border style widths for mouse offsets
var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

// initialize our canvas, add a ghost canvas, set draw loop
// then add everything we want to intially exist on the canvas
function init() {
  console.log('start');

  canvas = document.createElement('canvas');
  WIDTH = canvas.width = (window.innerWidth - 10);
  HEIGHT = canvas.height = (window.innerHeight - 10);  
  document.body.appendChild(canvas);

  ctx = canvas.getContext('2d');
  ghostcanvas = document.createElement('canvas');
  ghostcanvas.height = HEIGHT;
  ghostcanvas.width = WIDTH;
  gctx = ghostcanvas.getContext('2d');
  
  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.onselectstart = function () { return false; }
  
  // fixes mouse co-ordinate problems when there's a border or padding
  // see getMouse for more detail
  if (document.defaultView && document.defaultView.getComputedStyle) {
    stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  
  // make draw() fire every INTERVAL milliseconds
  setInterval(draw, INTERVAL);
  
  // set our events. Up and down are for dragging,
  // double click is for making new boxes
  canvas.onmousedown = myDown;
  canvas.onmouseup = myUp;
  canvas.onmousemove = myMove;
  // add custom initialization here:
  
  addRect(((WIDTH/2)-200), ((HEIGHT/2)-200), 25, 25, 'red');
  addRect(((WIDTH/2)-100), ((HEIGHT/2)-100), 25, 25, 'blue');
  updateInputs();

  measureBox.addEventListener("mouseover", ( event ) => {
    ipc.send('hoverOn', true);
  });

  measureBox.addEventListener("mouseleave", ( event ) => {
    ipc.send('hoverOff', true);
  });  


}

//wipes the canvas context
function clear(c) {
  c.clearRect(0, 0, WIDTH, HEIGHT);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
function draw() {
  if (canvasValid == false) {
    clear(ctx);
    
    // Add stuff you want drawn in the background all the time here
    
    // draw all boxes
    var l = boxes.length;
    for (var i = 0; i < l; i++) {
        drawshape(ctx, boxes[i], boxes[i].fill);
    }
    
    // draw selection
    // right now this is just a stroke along the edge of the selected box

    ctx.beginPath();
    ctx.moveTo( (boxes[0].x + (boxes[0].w / 2)) , (boxes[0].y + (boxes[0].h / 2)) );
    ctx.lineTo( (boxes[1].x + (boxes[1].w / 2)) , (boxes[1].y + (boxes[1].h / 2)) );
    ctx.strokeStyle = "#000000";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo( (boxes[0].x + (boxes[0].w / 2) -1) , (boxes[0].y + (boxes[0].h / 2) -1) );
    ctx.lineTo( (boxes[1].x + (boxes[1].w / 2) -1) , (boxes[1].y + (boxes[1].h / 2) -1) );
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();



    if (mySel != null) {
      ctx.strokeStyle = mySelColor;
      ctx.lineWidth = mySelWidth;
      ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
    }
    
    if(myHov != null && isHover) {
      ctx.strokeStyle = myHoverColor;
      ctx.lineWidth = myHoverWidth;
      ctx.strokeRect(myHov.x,myHov.y,myHov.w,myHov.h);
    }
    // Add stuff you want drawn on top all the time here
    
    
    canvasValid = true;
  }
}

// Draws a single shape to a single context
// draw() will call this with the normal canvas
// myDown will call this with the ghost canvas
function drawshape(context, shape, fill) {
  context.fillStyle = fill;
  
  // We can skip the drawing of elements that have moved off the screen:
  if (shape.x > WIDTH || shape.y > HEIGHT) return; 
  if (shape.x + shape.w < 0 || shape.y + shape.h < 0) return;
  
  context.fillRect(shape.x,shape.y,shape.w,shape.h);
}

// Happens when the mouse is moving inside the canvas
function myMove(e){
  if (isDrag){
    getMouse(e);
    mySel.x = mx - offsetx;
    mySel.y = my - offsety;
    // something is changing position so we better invalidate the canvas!
    canvas.style.cursor = 'move';

    updateInputs();

    invalidate();
  } else {
    myHover(e);
  }
}


function updateInputs() {
    input1_x.value = boxes[0].x +' , '+boxes[0].y;
    //input1_y.value = boxes[0].y;
    input2_x.value = boxes[1].x +' , '+boxes[1].y;
    //input2_y.value = boxes[1].y;
    var point1 = new Object;
    var point2 = new Object;
    point1.x = (boxes[0].x + (boxes[0].w / 2));
    point1.y = (boxes[0].y + (boxes[0].h / 2));
    point2.x = (boxes[1].x + (boxes[1].w / 2));
    point2.y = (boxes[1].y + (boxes[1].h / 2));
    distance.value = lineDistance(point1, point2);
    angle.value = lineAngle(point1, point2);
}




function myHover(e){
    getMouse(e);
    var l = boxes.length;
    myHov = null;
    for (var i = l-1; i >= 0; i--) {
      drawshape(gctx, boxes[i], 'black');
      var imageData = gctx.getImageData(mx, my, 1, 1);
      var index = (mx + my * imageData.width) * 4;
      // if the mouse pixel exists, select and break
      if((mx > boxes[i].x && mx < (boxes[i].x + boxes[i].w)) && (my > boxes[i].y && my < (boxes[i].y + boxes[i].h))) {
        console.log("HOVER");
        myHov = boxes[i];
        isHover = true;
        ipc.send('hoverOn', true);
        canvas.style.cursor = 'grab';
        invalidate();
        clear(gctx);        
        return;
      } else {
        canvas.style.cursor = 'default';        
      }
    }
}

// Happens when the mouse is clicked in the canvas
function myDown(e){
  getMouse(e);
  clear(gctx);
  var l = boxes.length;
  for (var i = l-1; i >= 0; i--) {
    // draw shape onto ghost context
    drawshape(gctx, boxes[i], 'black');
    
    // get image data at the mouse x,y pixel
    var imageData = gctx.getImageData(mx, my, 1, 1);
    var index = (mx + my * imageData.width) * 4;
    
    // if the mouse pixel exists, select and break
    if (imageData.data[3] > 0) {
      ipc.send('hoverOn', true);
      mySel = boxes[i];
      offsetx = mx - mySel.x;
      offsety = my - mySel.y;
      mySel.x = mx - offsetx;
      mySel.y = my - offsety;
      isDrag = true;
      invalidate();
      clear(gctx);
      return;
    }
    
  }
  // havent returned means we have selected nothing
  mySel = null;
  // clear the ghost canvas for next time
  clear(gctx);
  // invalidate because we might need the selection border to disappear
  invalidate();
}

function myUp(){
  ipc.send('hoverOff', true);
  canvas.style.cursor = 'default';  
  isDrag = false;
}

// adds a new node
function myDblClick(e) {
  getMouse(e);
  // for this method width and height determine the starting X and Y, too.
  // so I left them as vars in case someone wanted to make them args for something and copy this code
  var width = 20;
  var height = 20;
  addRect(mx - (width / 2), my - (height / 2), width, height, '#77DD44');
}

function invalidate() {
  canvasValid = false;
}

// Sets mx,my to the mouse position relative to the canvas
// unfortunately this can be tricky, we have to worry about padding and borders
function getMouse(e) {
      var element = canvas, offsetX = 0, offsetY = 0;
      if (element.offsetParent) {
        do {
          offsetX += element.offsetLeft;
          offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
      }
      // Add padding and border style widths to offset
      offsetX += stylePaddingLeft;
      offsetY += stylePaddingTop;

      offsetX += styleBorderLeft;
      offsetY += styleBorderTop;

      mx = e.pageX - offsetX;
      my = e.pageY - offsetY
}


function lineDistance( point1, point2 ){
    var xs = 0;
    var ys = 0;

    xs = point2.x - point1.x;
    xs = xs * xs;

    ys = point2.y - point1.y;
    ys = ys * ys;

    return Math.sqrt( xs + ys );
}

//function angle(cx, cy, ex, ey) {
function lineAngle(point1, point2) {
  var dy = point2.y - point1.y;
  var dx = point2.x - point1.x;
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  return theta;
}



init();