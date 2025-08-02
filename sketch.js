let encodings;
let clockGrid = [];
let lastSecond = -1;
let animationStartTime = 0;

let CLOCK_DIAMETER, SPACING;

const CHAR_GRID_WIDTH = 3;
const CHAR_GRID_HEIGHT = 5;
const NUM_CHAR_SLOTS = 11; // HH:MM:SS AM/PM

const ANIMATION_DURATION = 500; // in ms

function preload() {
  encodings = loadJSON('encodings.json');
}

function setup() {
  // Get height from URL parameter, or use a default value
  const urlParams = new URLSearchParams(window.location.search);
  const desiredHeight = parseInt(urlParams.get('height')) || 230; // Default height is 230px

  // Calculate clock dimensions based on desired height
  // The total height is made of 5 clocks and 2 spacing units (top/bottom)
  // We maintain a ratio of spacing:diameter of 15:40 (or 0.375)
  const SPACING_TO_DIAMETER_RATIO = 0.375;
  const TOTAL_UNITS_IN_HEIGHT = CHAR_GRID_HEIGHT + (2 * SPACING_TO_DIAMETER_RATIO); // 5 + 0.75 = 5.75
  CLOCK_DIAMETER = desiredHeight / TOTAL_UNITS_IN_HEIGHT;
  SPACING = CLOCK_DIAMETER * SPACING_TO_DIAMETER_RATIO;

  // Calculate canvas width to maintain aspect ratio
  const canvasWidth = NUM_CHAR_SLOTS * (CHAR_GRID_WIDTH * CLOCK_DIAMETER) + (NUM_CHAR_SLOTS + 1) * SPACING;

  createCanvas(canvasWidth, desiredHeight);
  angleMode(DEGREES);
  frameRate(60);

  // Initialize the clock grid state
  const totalClocks = NUM_CHAR_SLOTS * CHAR_GRID_WIDTH * CHAR_GRID_HEIGHT;
  for (let i = 0; i < totalClocks; i++) {
    clockGrid.push({
      startAlpha: 60,
      goalAlpha: 60,
      currentAlpha: 60,
      startHourAngle: 0,
      startMinuteAngle: 0,
      startSecondAngle: 0,
      goalHourAngle: 0,
      goalMinuteAngle: 0,
      goalSecondAngle: 0,
      currentHourAngle: 0,
      currentMinuteAngle: 0,
      currentSecondAngle: 0,
    });
  }
  updateGoalStates();
}

function draw() {
  background(230);

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

    // Interpolate values for smooth animation
    state.currentAlpha = lerp(state.startAlpha, state.goalAlpha, progress);
    state.currentHourAngle = lerpAngle(state.startHourAngle, state.goalHourAngle, progress);
    state.currentMinuteAngle = lerpAngle(state.startMinuteAngle, state.goalMinuteAngle, progress);
    state.currentSecondAngle = lerpAngle(state.startSecondAngle, state.goalSecondAngle, progress);

    // Calculate clock position
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

  // If the first digit of a two-digit number is 0, replace it with a space.
  if (h12 < 10) {
    timeChars[0] = 'space';
  }
  if (m < 10) {
    timeChars[3] = 'space';
  }
  if (s < 10) {
    timeChars[6] = 'space';
  }

  // Calculate goal angles for inactive clocks (pointing to the next second)
  const next_s = (s + 1) % 60;
  const next_m = (next_s === 0) ? (m + 1) % 60 : m;
  const next_h = (next_m === 0 && next_s === 0) ? (h + 1) % 24 : h;

  const inactiveGoalH = map(next_h % 12 + next_m / 60, 0, 12, 0, 360);
  const inactiveGoalM = map(next_m + next_s / 60, 0, 60, 0, 360);
  const inactiveGoalS = map(next_s, 0, 60, 0, 360);

  // Iterate through each character slot and update the state of its clocks
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

        // Set start state for animation
        state.startAlpha = state.currentAlpha;
        state.startHourAngle = state.currentHourAngle;
        state.startMinuteAngle = state.currentMinuteAngle;
        state.startSecondAngle = state.currentSecondAngle;

        if (timeString) { // Active clock (part of a character)
          state.goalAlpha = 255;
          const [goalH, goalM, goalS] = timeString.split(':').map(Number);
          state.goalHourAngle = map(goalH % 12, 0, 12, 0, 360);
          state.goalMinuteAngle = map(goalM, 0, 60, 0, 360);
          state.goalSecondAngle = map(goalS, 0, 60, 0, 360);
        } else { // Inactive clock
          state.goalAlpha = 60;
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
  fill(color(244, 122, 158, alpha));
  ellipse(0, 0, diameter, diameter);
  fill(color(237, 34, 93, alpha));
  ellipse(0, 0, diameter * 0.9, diameter * 0.9);

  strokeCap(ROUND);

  // Hour hand
  stroke(color(255, alpha));
  strokeWeight(diameter * 0.0875);
  push();
  rotate(hAngle);
  line(0, 0, 0, -radius * 0.5);
  pop();

  // Minute hand
  stroke(color(255, alpha));
  strokeWeight(diameter * 0.05);
  push();
  rotate(mAngle);
  line(0, 0, 0, -radius * 0.8);
  pop();

  // Second hand
  stroke(color(255, alpha * 1.1));
  strokeWeight(diameter * 0.025);
  push();
  rotate(sAngle);
  line(0, 0, 0, -radius * 0.9);
  pop();

  pop();
}

function lerpAngle(start, end, amt) {
  let diff = end - start;
  // Find the shortest path for rotation
  if (diff > 180) {
    end -= 360;
  } else if (diff < -180) {
    end += 360;
  }
  return (lerp(start, end, amt) + 360) % 360;
}
