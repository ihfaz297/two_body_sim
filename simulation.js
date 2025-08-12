let stars = [];
let trailLayer;
let starLayer;

// --- UI Elements ---
let uiContainer, sliderValueSpans = {};
let m1Slider, m2Slider, x1Slider, y1Slider, x2Slider, y2Slider, timeSlider;
let v1xSlider, v1ySlider, v2xSlider, v2ySlider;
let resetButton, toggleUIButton, trailCheckbox, pauseButton;

// --- Simulation State & Physics ---
let bodies = [];
const G = 1;
let timeScale = 1;
const cor = 1;
let softening = 10;
const FIXED_DT = 0.001;
let comX, comY, totalMomentum, prevComX, prevComY, comDrift;
let lastCollisionFrame = -100;
let showTrails = true;
let showUI = true;
let totalEnergy = 0;
let frameRateValue = 0;
let isPaused = false;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  
  // Create graphics layers
  starLayer = createGraphics(width, height);
  trailLayer = createGraphics(width, height);
  generateStars();
  drawStarsToLayer();
  
  // UI Panel Setup
  createUIPanel();
  
  // Initialize Simulation
  resetSimulation();
  
  // Attach UI Listeners
  resetButton.mousePressed(resetSimulation);
  toggleUIButton.mousePressed(toggleUIVisibility);
  trailCheckbox.changed(() => {
    showTrails = trailCheckbox.checked();
    console.log('Trails toggled:', showTrails);
    if (!showTrails) {
      trailLayer.clear();
    }
  });
  pauseButton.mousePressed(togglePause);
}

function generateStars() {
  let saved = localStorage.getItem('stars');
  if (saved) {
    stars = JSON.parse(saved);
  } else {
    for (let i = 0; i < 300; i++) {
      stars.push({
        x: random(width),
        y: random(height),
        size: random(0.5, 2),
        phase: random(TWO_PI),
        speed: random(0.01, 0.03)
      });
    }
    localStorage.setItem('stars', JSON.stringify(stars));
  }
}

function drawStarsToLayer() {
  starLayer.background(0);
  starLayer.noStroke();
  for (let s of stars) {
    let alpha = 200; // Static alpha for performance
    starLayer.fill(255, alpha);
    starLayer.ellipse(s.x, s.y, s.size);
  }
}

function createUIPanel() {
    uiContainer = createDiv().id('ui-container');

    const createSliderWithLabel = (label, key, min, max, initial, step, parentDiv) => {
        const wrapper = createDiv().class('slider-wrapper').parent(parentDiv);
        createSpan(label).parent(wrapper);
        const slider = createSlider(min, max, initial, step).parent(wrapper);
        const valueSpan = createSpan(initial.toFixed(key.startsWith('v') || key === 'time' ? 1 : 0)).class('value').parent(wrapper);
        sliderValueSpans[key] = valueSpan;
        return slider;
    };
    
    // Body 1 Controls
    const group1 = createDiv().class('control-group').id('group1').parent(uiContainer);
    createP('Body 1').class('title').parent(group1);
    m1Slider  = createSliderWithLabel('Mass', 'm1', 10, 100, 30, 1, group1);
    x1Slider  = createSliderWithLabel('X Pos', 'x1', -400, 400, -100, 1, group1);
    y1Slider  = createSliderWithLabel('Y Pos', 'y1', -400, 400, 0, 1, group1);
    v1xSlider = createSliderWithLabel('X Vel', 'v1x', -50, 50, 0, 0.1, group1);
    v1ySlider = createSliderWithLabel('Y Vel', 'v1y', -50, 50, 0, 0.1, group1);

    // Body 2 Controls
    const group2 = createDiv().class('control-group').id('group2').parent(uiContainer);
    createP('Body 2').class('title').parent(group2);
    m2Slider  = createSliderWithLabel('Mass', 'm2', 10, 100, 30, 1, group2);
    x2Slider  = createSliderWithLabel('X Pos', 'x2', -400, 400, 100, 1, group2);
    y2Slider  = createSliderWithLabel('Y Pos', 'y2', -400, 400, 0, 1, group2);
    v2xSlider = createSliderWithLabel('X Vel', 'v2x', -50, 50, 0, 0.1, group2);
    v2ySlider = createSliderWithLabel('Y Vel', 'v2y', -50, 50, 0, 0.1, group2);

    // Settings Controls
    const group3 = createDiv().class('control-group').id('group3').parent(uiContainer);
    createP('Settings').class('title').parent(group3);
    timeSlider = createSliderWithLabel('Time', 'time', 0.1, 5, 1, 0.1, group3);
    
    const actionGroup = createDiv().class('action-group').parent(group3);
    const checkboxWrapper = createDiv().class('checkbox-wrapper').parent(actionGroup);
    trailCheckbox = createCheckbox('', true).parent(checkboxWrapper);
    createSpan('Trails').parent(checkboxWrapper);
    
    resetButton = createButton('Reset').class('control-button').parent(actionGroup);
    toggleUIButton = createButton('Toggle UI').class('control-button').parent(actionGroup);
    pauseButton = createButton('Pause').class('control-button').parent(actionGroup);
}

function toggleUIVisibility() {
  showUI = !showUI;
  console.log('Toggle UI:', showUI);
  select('#group1').style('display', showUI ? 'flex' : 'none');
  select('#group2').style('display', showUI ? 'flex' : 'none');
}

function togglePause() {
  isPaused = !isPaused;
  pauseButton.html(isPaused ? 'Resume' : 'Pause');
  console.log('Pause toggled:', isPaused);
}

function resetSimulation() {
  bodies = [];
  let x1 = x1Slider.value();
  let y1 = y1Slider.value();
  let x2 = x2Slider.value();
  let y2 = y2Slider.value();
  let m1 = m1Slider.value();
  let m2 = m2Slider.value();
  let v1x = v1xSlider.value();
  let v1y = v1ySlider.value();
  let v2x = v2xSlider.value();
  let v2y = v2ySlider.value();
  
  bodies.push(new Body(x1, y1, v1x, v1y, m1, [0, 150, 255]));
  bodies.push(new Body(x2, y2, v2x, v2y, m2, [255, 100, 0]));
  
  softening = 10 * sqrt(0.5 * (m1 + m2));
  trailLayer.clear();
  
  prevComX = null;
  computeTotalEnergy();
}

function updateSliderLabels() {
    sliderValueSpans['m1'].html(m1Slider.value());
    sliderValueSpans['x1'].html(x1Slider.value());
    sliderValueSpans['y1'].html(y1Slider.value());
    sliderValueSpans['v1x'].html(v1xSlider.value().toFixed(1));
    sliderValueSpans['v1y'].html(v1ySlider.value().toFixed(1));
    sliderValueSpans['m2'].html(m2Slider.value());
    sliderValueSpans['x2'].html(x2Slider.value());
    sliderValueSpans['y2'].html(y2Slider.value());
    sliderValueSpans['v2x'].html(v2xSlider.value().toFixed(1));
    sliderValueSpans['v2y'].html(v2ySlider.value().toFixed(1));
    sliderValueSpans['time'].html(timeSlider.value().toFixed(1));
}

function draw() {
  // Physics calculations (only if not paused)
  if (bodies.length >= 2 && !isPaused) {
    timeScale = timeSlider.value();
    let numSubSteps = max(1, floor(timeScale * 200));
    for (let i = 0; i < numSubSteps; i++) {
      velocityVerletStep(FIXED_DT, i);
      handleCollisions(FIXED_DT);
    }
  }

  // Drawing Logic
  background(0);
  if (!showTrails) {
    image(starLayer, 0, 0);
  } else {
    image(trailLayer, 0, 0);
    trailLayer.fill(0, 0, 0, 5);
    trailLayer.noStroke();
    trailLayer.rect(0, 0, width, height);
  }

  for (let body of bodies) {
    if (showTrails) {
      body.drawTrail();
    }
    body.display();
    drawMomentumArrow(body);
  }

  if (frameCount - lastCollisionFrame < 10) {
    fill(255, 255, 255, 150);
    noStroke();
    let midPoint = p5.Vector.lerp(bodies[0].pos, bodies[1].pos, 0.5);
    let s = screenPos(midPoint.x, midPoint.y);
    ellipse(s.x, s.y, 80);
  }

  computeCOMandMomentum();
  computeTotalEnergy();
  drawCenterOfMass();

  frameRateValue = frameRate();
  drawStats(); 
  
  if (showUI) {
    updateSliderLabels();
  }
}

function drawStats() {
  fill(255);
  textSize(14);
  textFont('Helvetica Neue');
  textAlign(LEFT);
  const yPos = 20; 
  text('Energy: ' + totalEnergy.toFixed(2), 20, yPos);
  text('Momentum: ' + totalMomentum.toFixed(2), 220, yPos);
  text('FPS: ' + frameRateValue.toFixed(1), 420, yPos);
  
  if (frameCount - lastCollisionFrame < 10) {
    fill(255, 0, 0);
    textAlign(CENTER);
    text('COLLISION!', width/2, yPos);
  }
}

function velocityVerletStep(dt, stepIndex) {
  for (let body of bodies) {
    body.computeForce(bodies);
    body.cachedAccel = p5.Vector.div(body.force, body.mass);
  }
  for (let body of bodies) {
    body.vel.add(p5.Vector.mult(body.cachedAccel, dt / 2));
  }
  for (let body of bodies) {
    body.pos.add(p5.Vector.mult(body.vel, dt));
    if (showTrails && stepIndex % 5 === 0) {
      body.updateTrail();
    }
  }
  for (let body of bodies) {
    body.computeForce(bodies);
    let accel = p5.Vector.div(body.force, body.mass);
    body.vel.add(p5.Vector.mult(accel, dt / 2));
  }
}

function computeTotalEnergy() {
  let kinetic = 0;
  let potential = 0;
  for (let body of bodies) {
    let vel = body.vel.mag();
    kinetic += 0.5 * body.mass * vel * vel;
  }
  let r = p5.Vector.sub(bodies[1].pos, bodies[0].pos).mag();
  potential = -G * bodies[0].mass * bodies[1].mass / sqrt(r * r + softening * softening);
  totalEnergy = kinetic + potential;
}

function drawMomentumArrow(body) {
  let momentum = p5.Vector.mult(body.vel, body.mass);
  let scale = 0.5;
  let arrowLength = momentum.mag() * scale;
  if (arrowLength > 0) {
    let s = screenPos(body.pos.x, body.pos.y);
    let endPoint = screenPos(body.pos.x + momentum.x * scale, body.pos.y + momentum.y * scale);
    stroke(body.color[0], body.color[1], body.color[2], 200);
    strokeWeight(2);
    line(s.x, s.y, endPoint.x, endPoint.y);
    let angle = atan2(endPoint.y - s.y, endPoint.x - s.x);
    let arrowSize = 10;
    push();
    translate(endPoint.x, endPoint.y);
    rotate(angle);
    line(0, 0, -arrowSize, -arrowSize / 2);
    line(0, 0, -arrowSize, arrowSize / 2);
    pop();
  }
}

function computeCOMandMomentum() {
  let totalMass = 0, xSum = 0, ySum = 0;
  let momentumX = 0, momentumY = 0;
  for (let body of bodies) {
    totalMass += body.mass;
    xSum += body.pos.x * body.mass;
    ySum += body.pos.y * body.mass;
    momentumX += body.mass * body.vel.x;
    momentumY += body.mass * body.vel.y;
  }
  comX = totalMass > 0 ? xSum / totalMass : 0;
  comY = totalMass > 0 ? ySum / totalMass : 0;
  totalMomentum = createVector(momentumX, momentumY).mag();

  if (prevComX !== null) {
    comDrift = createVector(comX - prevComX, comY - prevComY).mag();
  } else {
    comDrift = 0;
  }
  prevComX = comX;
  prevComY = comY;
}

function handleCollisions(dt) {
  let b1 = bodies[0];
  let b2 = bodies[1];
  let distVec = p5.Vector.sub(b2.pos, b1.pos);
  let distance = distVec.mag();
  let minDist = (sqrt(b1.mass) + sqrt(b2.mass)) * 1.5;

  if (distance > minDist * 2) return;

  if (distance < minDist) {
    lastCollisionFrame = frameCount;
    distVec.normalize();
    let relVel = p5.Vector.sub(b1.vel, b2.vel).dot(distVec);
    let impulse = (1 + cor) * relVel / (1/b1.mass + 1/b2.mass);
    let impulseVec = distVec.mult(impulse);
    
    b1.vel.sub(p5.Vector.div(impulseVec, b1.mass));
    b2.vel.add(p5.Vector.div(impulseVec, b2.mass));
    
    let correction = distVec.copy().mult((minDist - distance) * 0.5);
    b1.pos.sub(correction);
    b2.pos.add(correction);
    
    if (cor === 0) {
      let totalMass = b1.mass + b2.mass;
      let vAvg = p5.Vector.add(p5.Vector.mult(b1.vel, b1.mass), p5.Vector.mult(b2.vel, b2.mass)).div(totalMass);
      b1.vel = vAvg.copy();
      b2.vel = vAvg.copy();
    }
  }
}

function drawCenterOfMass() {
  let pulse = 50 + 20 * sin(frameCount * 0.1);
  noStroke();
  fill(0, 255, 0, 100);
  let s = screenPos(comX, comY);
  ellipse(s.x, s.y, pulse);
  fill(0, 255, 0);
  ellipse(s.x, s.y, 8);
}

function screenPos(x, y) {
  return createVector(width / 2 + x, height / 2 + y);
}

class Body {
  constructor(x, y, vx, vy, mass, color) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.mass = mass;
    this.color = color;
    this.force = createVector(0, 0);
    this.cachedAccel = createVector(0, 0);
    this.radius = sqrt(mass) * 0.8;
    this.trail = [];
    this.maxTrailLength = 30;
  }

  computeForce(others) {
    this.force.set(0, 0);
    for (let other of others) {
      if (other === this) continue;
      let r = p5.Vector.sub(other.pos, this.pos);
      let distSq = r.magSq() + softening * softening;
      let f = (G * this.mass * other.mass) / (distSq * sqrt(distSq));
      this.force.add(p5.Vector.mult(r, f));
    }
  }

  updateTrail() {
    this.trail.push(this.pos.copy());
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    console.log('Trail updated, length:', this.trail.length, 'Color:', this.color);
  }

  drawTrail() {
    if (this.trail.length < 2) return;
    
    trailLayer.noFill();
    trailLayer.strokeWeight(1);
    for (let i = 1; i < this.trail.length; i++) {
      let alpha = map(i, 1, this.trail.length, 30, 150);
      trailLayer.stroke(this.color[0], this.color[1], this.color[2], alpha);
      let p1 = screenPos(this.trail[i-1].x, this.trail[i-1].y);
      let p2 = screenPos(this.trail[i].x, this.trail[i].y);
      trailLayer.line(p1.x, p1.y, p2.x, p2.y);
    }
  }

  display() {
    push();
    let s = screenPos(this.pos.x, this.pos.y);
    translate(s.x, s.y);
    noStroke();
    fill(this.color[0], this.color[1], this.color[2], 50);
    ellipse(0, 0, this.radius * 3);
    fill(this.color[0], this.color[1], this.color[2], 100);
    ellipse(0, 0, this.radius * 2);
    fill(this.color);
    ellipse(0, 0, this.radius * 2);
    fill(255, 255, 255, 100);
    ellipse(-this.radius/3, -this.radius/3, this.radius/2);
    pop();
  }
}
