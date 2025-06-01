// sketch.js (in your p5-clock-widget repository)

// Declare variables for shape radii and dimensions
let secondsRadius;
let minutesRadius;
let hoursRadius;
let clockDiameter;

let canvasWidth;
let canvasHeight;

function setup() {
  // Get dimensions from URL parameters, with defaults
  const urlParams = new URLSearchParams(window.location.search);
  canvasWidth = parseInt(urlParams.get('width')) || 200; // Default width 200px
  canvasHeight = parseInt(urlParams.get('height')) || 200; // Default height 200px

  createCanvas(canvasWidth, canvasHeight);
  stroke(255);
  angleMode(DEGREES);

  // Set radius for each shape based on new canvas dimensions
  let radius = min(canvasWidth, canvasHeight) / 2;
  secondsRadius = radius * 0.71;
  minutesRadius = radius * 0.6;
  hoursRadius = radius * 0.5;
  clockDiameter = radius * 1.7;

  // describe('Functioning pink clock.'); // Optional: keep or remove describe
}

function draw() {
  // If you want the iframe background to be transparent and show your main site's background under the clock elements:
  // clear(); // Use clear() instead of background() for a transparent canvas background
  // OR, if the clock should always have its own background color (as originally designed):
  background(230); // Grey background for the clock canvas

  // Move origin to center of its own canvas
  translate(canvasWidth / 2, canvasHeight / 2);

  // Draw the clock background
  noStroke();
  fill(244, 122, 158);
  ellipse(0, 0, clockDiameter + 25, clockDiameter + 25);
  fill(237, 34, 93);
  ellipse(0, 0, clockDiameter, clockDiameter);

  // Calculate angle for each hand
  let s = second();
  let m = minute();
  let h = hour();

  let secondAngle = map(s, 0, 60, 0, 360);
  let minuteAngle = map(m, 0, 60, 0, 360);
  // Using h % 12 for 12-hour format, and m/60 for smoother hour hand movement
  let currentHour = h % 12;
  if (currentHour === 0 && h > 0) currentHour = 12; // Adjust for 12 PM/AM
  let hourAngle = map(currentHour + m / 60, 0, 12, 0, 360);


  stroke(255);

  // Second hand
  push();
  rotate(secondAngle);
  strokeWeight(1);
  line(0, 0, 0, -secondsRadius);
  pop();

  // Minute hand
  push();
  strokeWeight(2);
  rotate(minuteAngle);
  line(0, 0, 0, -minutesRadius);
  pop();

  // Hour hand
  push();
  strokeWeight(4);
  rotate(hourAngle);
  line(0, 0, 0, -hoursRadius);
  pop();

  // Tick markers
  push();
  strokeWeight(2);
  for (let ticks = 0; ticks < 60; ticks++) { // Use < 60 for 60 ticks (0-59)
    point(0, -secondsRadius);
    rotate(6); // 360 / 60 = 6 degrees per tick
  }
  pop();
}
