// Global variables
let encodings;
let clockGrid = [];
let lastSecond = -1;
let animationStartTime = 0;

// --- Default Configuration ---
let config = {
  bgColor: '#e6e6e6',
  faceColor1: '#f47a9e',
  faceColor2: '#ed225d',
  handColor: '#ffffff',
  inactiveAlpha: 60,
  transparentBg: false
};

// --- Dynamic Style & Layout Variables ---
let CLOCK_DIAMETER, SPACING;

// --- Static Layout Constants ---
const CHAR_GRID_WIDTH = 3;
const CHAR_GRID_HEIGHT = 5;
const NUM_CHAR_SLOTS = 11; // HH:MM:SS AM/PM

// --- Animation Constants ---
const ANIMATION_DURATION = 500; // in ms

function preload() {
  encodings = loadJSON('encodings.json');
}

function setup() {
  const urlParams = new URLSearchParams(window.location.search);

  // --- Size Configuration ---
  const desiredHeight = parseInt(urlParams.get('height')) || 230;
  const SPACING_TO_DIAMETER_RATIO = 0.375;
  const TOTAL_UNITS_IN_HEIGHT = CHAR_GRID_HEIGHT + (2 * SPACING_TO_DIAMETER_RATIO);
  CLOCK_DIAMETER = desiredHeight / TOTAL_UNITS_IN_HEIGHT;
  SPACING = CLOCK_DIAMETER * SPACING_TO_DIAMETER_RATIO;
  const canvasWidth = NUM_CHAR_SLOTS * (CHAR_GRID_WIDTH * CLOCK_DIAMETER) + (NUM_CHAR_SLOTS + 1) * SPACING;

  // --- Color & Style Configuration ---
  const getColorParam = (name, defaultValue) => {
    let colorStr = urlParams.get(name);
    if (colorStr) { return colorStr.startsWith('#') ? colorStr : '#' + colorStr; }
    return defaultValue;
  };
  config.bgColor = getColorParam('bgColor', config.bgColor);
  config.faceColor1 = getColorParam('faceColor1', config.faceColor1);
  config.faceColor2 = getColorParam('faceColor2', config.faceColor2);
  config.handColor = getColorParam('handColor', config.handColor);
  config.inactiveAlpha = parseInt(urlParams.get('inactiveAlpha')) || config.inactiveAlpha;
  config.transparentBg = urlParams.get('transparentBg') === 'true';


  createCanvas(canvasWidth, desiredHeight);
  angleMode(DEGREES);
  frameRate(60);

  // Initialize the clock grid state
  const totalClocks = NUM_CHAR_SLOTS * CHAR_GRID_WIDTH * CHAR_GRID_HEIGHT;
  for (let i = 0; i < totalClocks; i++) {
    clockGrid.push({
      startAlpha: config.inactiveAlpha, goalAlpha: config.inactiveAlpha, currentAlpha: config.inactiveAlpha,
      startHourAngle: 0, startMinuteAngle: 0, startSecondAngle: 0,
      goalHourAngle: 0, goalMinuteAngle: 0, goalSecondAngle: 0,
      currentHourAngle: 0, currentMinuteAngle: 0, currentSecondAngle: 0,
    });
  }
  updateGoalStates();
}

function draw() {
  if (config.transparentBg) {
    clear(); // Use clear() for a transparent background
  } else {
    background(config.bgColor); // Otherwise, use the specified background color
  }

  let s = second();
  if (s !== lastSecond) {
    lastSecond = s;
    updateGoalStates();
    animationStartTime = millis();
  }

  const elapsed = millis() - animationStartTime;
  const progress = constrain(elapsed / ANIMATION_DURATION, 0, 1);

  for (let i = 0; i < clockGrid.length; i++) {
    const state = clockGrid[i];
    state.currentAlpha = lerp(state.startAlpha, state.goalAlpha, progress);
    state.currentHourAngle = lerpAngle(state.startHourAngle, state.goalHourAngle, progress);
    state.currentMinuteAngle = lerpAngle(state.startMinuteAngle, state.goalMinuteAngle, progress);
    state.currentSecondAngle = lerpAngle(state.startSecondAngle, state.goalSecondAngle, progress);

    const charIndex = floor(i / (CHAR_GRID_WIDTH * CHAR_GRID_HEIGHT));
    const clockInCharIndex = i % (CHAR_GRID_WIDTH * CHAR_GRID_HEIGHT);
    const c = clockInCharIndex % CHAR_GRID_WIDTH;
    const r = floor(clockInCharIndex / CHAR_GRID_WIDTH);

    const startCanvasX = SPACING;
    const startCanvasY = SPACING;
    const charX = startCanvasX + charIndex * (CHAR_GRID_WIDTH * CLOCK_DIAMETER + SPACING);
    const clockX = charX + c * CLOCK_DIAMETER + CLOCK_DIAMETER / 2;
    const clockY = startCanvasY + r * CLOCK_DIAMETER + CLOCK_DIAMETER / 2;

    drawSmallClock(clockX, clockY, CLOCK_DIAMETER, state.currentHourAngle, state.currentMinuteAngle, state.currentSecondAngle, state.currentAlpha);
  }
}

function updateGoalStates() {
  const h = hour();
  const m = minute();
  const s = second();
  const ampmChar = h >= 12 ? 'P' : 'A';
  let h12 = h % 12 || 12;

  const timeChars = [
    nf(h12, 2)[0], nf(h12, 2)[1], 'colon',
    nf(m, 2)[0], nf(m, 2)[1], 'colon',
    nf(s, 2)[0], nf(s, 2)[1], 'space',
    ampmChar, 'M'
  ];

  if (h12 < 10) { timeChars[0] = 'space'; }
  if (m < 10) { timeChars[3] = 'space'; }
  if (s < 10) { timeChars[6] = 'space'; }

  const next_s = (s + 1) % 60;
  const next_m = (next_s === 0) ? (m + 1) % 60 : m;
  const next_h = (next_m === 0 && next_s === 0) ? (h + 1) % 24 : h;
  const inactiveGoalH = map(next_h % 12 + next_m / 60, 0, 12, 0, 360);
  const inactiveGoalM = map(next_m + next_s / 60, 0, 60, 0, 360);
  const inactiveGoalS = map(next_s, 0, 60, 0, 360);

  for (let i = 0; i < NUM_CHAR_SLOTS; i++) {
    const charKey = timeChars[i];
    const pattern = (charKey === 'space') ?
      Array(CHAR_GRID_HEIGHT).fill(Array(CHAR_GRID_WIDTH).fill(null)) :
      encodings[charKey];

    for (let r = 0; r < CHAR_GRID_HEIGHT; r++) {
      for (let c = 0; c < CHAR_GRID_WIDTH; c++) {
        const flatIndex = i * (CHAR_GRID_WIDTH * CHAR_GRID_HEIGHT) + r * CHAR_GRID_WIDTH + c;
        const state = clockGrid[flatIndex];
        const timeString = pattern[r][c];
        state.startAlpha = state.currentAlpha;
        state.startHourAngle = state.currentHourAngle;
        state.startMinuteAngle = state.currentMinuteAngle;
        state.startSecondAngle = state.currentSecondAngle;

        if (timeString) {
          state.goalAlpha = 255;
          const [goalH, goalM, goalS] = timeString.split(':').map(Number);
          state.goalHourAngle = map(goalH % 12, 0, 12, 0, 360);
          state.goalMinuteAngle = map(goalM, 0, 60, 0, 360);
          state.goalSecondAngle = map(goalS, 0, 60, 0, 360);
        } else {
          state.goalAlpha = config.inactiveAlpha;
          state.goalHourAngle = inactiveGoalH;
          state.goalMinuteAngle = inactiveGoalM;
          state.goalSecondAngle = inactiveGoalS;
        }
      }
    }
  }
}

function drawSmallClock(x, y, diameter, hAngle, mAngle, sAngle, alpha) {
  const radius = diameter / 2;
  push();
  translate(x, y);

  // Clock face
  noStroke();
  let c1 = color(config.faceColor1);
  c1.setAlpha(alpha);
  fill(c1);
  ellipse(0, 0, diameter, diameter);

  let c2 = color(config.faceColor2);
  c2.setAlpha(alpha);
  fill(c2);
  ellipse(0, 0, diameter * 0.9, diameter * 0.9);

  strokeCap(ROUND);

  // Hands
  let handColorObj = color(config.handColor);

  // Hour hand
  handColorObj.setAlpha(alpha);
  stroke(handColorObj);
  strokeWeight(diameter * 0.0875);
  push();
  rotate(hAngle);
  line(0, 0, 0, -radius * 0.5);
  pop();

  // Minute hand
  stroke(handColorObj); // Alpha is already set
  strokeWeight(diameter * 0.05);
  push();
  rotate(mAngle);
  line(0, 0, 0, -radius * 0.8);
  pop();

  // Second hand
  handColorObj.setAlpha(alpha * 1.1); // Slightly brighter
  stroke(handColorObj);
  strokeWeight(diameter * 0.025);
  push();
  rotate(sAngle);
  line(0, 0, 0, -radius * 0.9);
  pop();

  pop();
}

function lerpAngle(start, end, amt) {
  let diff = end - start;
  if (diff > 180) { end -= 360; }
  else if (diff < -180) { end += 360; }
  return (lerp(start, end, amt) + 360) % 360;
}
