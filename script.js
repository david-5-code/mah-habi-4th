
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const winModal = document.getElementById("winModal");
const messageModal = document.getElementById("messageModal");


const MAX_PULL = 60; // Maximum na paghila ng bowstring

let W, H, scale;
let attempts = 0;
let score = 0;
let won = false;
let shooting = false;
let dragging = false;
let arrow = null;
let pullDistance = 0;
let arrowAngle = 0;
let particles = [];
let target = { x: 0, y: 0, r: 28 };
let aim = { x: 0, y: 0 };
let power = 19;
let frame = 0;
let lastTime = 0;

const bow = { x: 0, y: 0 };

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  W = rect.width;
  H = rect.height;
  scale = dpr;

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  bow.x = W * 0.14;
  bow.y = H * 0.55;

  target.x = W * 0.85;
  target.y = H * 0.5;

  aim.x = W * 0.65;
  aim.y = H * 0.50;
}

function heartPath(x, y, size) {
  size = size * 0.5; // Mas maliit na heart

  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(
    x - size * 1.2, y - size * 0.3,
    x - size * 0.65, y - size * 1.1,
    x, y - size * 0.55
  );
  ctx.bezierCurveTo(
    x + size * 0.65, y - size * 1.1,
    x + size * 1.2, y - size * 0.3,
    x, y + size * 0.35
  );
  ctx.closePath();
}

function drawHeart(x, y, r) {
  ctx.save();

  // 3D shadow
  ctx.save();
  ctx.translate(5, 7);
  heartPath(x, y, r);
  ctx.fillStyle = "#d2a0ac";
  ctx.fill();
  ctx.restore();

  // Main heart
  const gradient = ctx.createLinearGradient(
    x - r, y - r, x + r, y + r
  );
  gradient.addColorStop(0, "#ff7997");
  gradient.addColorStop(0.45, "#ec174b");
  gradient.addColorStop(1, "#8c092c");

  heartPath(x, y, r);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Highlight
  ctx.beginPath();
  ctx.ellipse(
    x - r * 0.28,
    y - r * 0.36,
    r * 0.18,
    r * 0.09,
    -0.5, 0, Math.PI * 2
  );
  ctx.fillStyle = "#ffffff90";
  ctx.fill();

}

function drawBow() {
  const x = bow.x;
  const y = bow.y;

  // Bow body
  ctx.beginPath();
  ctx.moveTo(x, y - 100);
  ctx.bezierCurveTo(
    x + 95, y - 70,
    x + 95, y + 70,
    x, y + 100
  );

  ctx.lineWidth = 11;
  ctx.strokeStyle = "#8a4a16";
  ctx.lineCap = "round";
  ctx.stroke();

  // Wooden highlight
  ctx.beginPath();
  ctx.moveTo(x + 3, y - 95);
  ctx.bezierCurveTo(
    x + 84, y - 65,
    x + 84, y + 65,
    x + 3, y + 95
  );
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#d9a45a";
  ctx.stroke();

  
  
  // Bowstring: dulo ng tali ay nasa red feathers
  const stringPull = !shooting && dragging
    ? Math.min(MAX_PULL, Math.max(0, pullDistance))
    : 0;

  const stringX = x - stringPull;
  const stringY = y;

  ctx.beginPath();
  ctx.moveTo(x, y - 100);
  ctx.lineTo(stringX, stringY);
  ctx.lineTo(x, y + 100);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#5d421d";
  ctx.stroke();


  // Grip
  ctx.beginPath();
  ctx.moveTo(x + 55, y - 15);
  ctx.lineTo(x + 55, y + 15);
  ctx.lineWidth = 15;
  ctx.strokeStyle = "#4d3218";
  ctx.stroke();
}


function drawArrow(x, y, angle, length = 100) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Arrow shaft: nagsisimula sa pulang likod
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length * 0.8, 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#72501d";
  ctx.stroke();

  // Metallic arrowhead
  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(length * 0.78, -7);
  ctx.lineTo(length * 0.80, 0);
  ctx.lineTo(length * 0.78, 7);
  ctx.closePath();

  const metal = ctx.createLinearGradient(0, -7, 0, 7);
  metal.addColorStop(0, "#eeeeee");
  metal.addColorStop(1, "#888888");

  ctx.fillStyle = metal;
  ctx.fill();

  // Red feathers sa likod ng arrow
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-length * 0.15, -7);
  ctx.lineTo(-length * 0.1, 0);
  ctx.lineTo(-length * 0.15, 7);
  ctx.closePath();

  ctx.fillStyle = "#d7193f";
  ctx.fill();

  ctx.restore();
}


function drawBackground() {
  ctx.clearRect(0, 0, W, H);
}

function createBurst(x, y) {
  for (let i = 0; i < 65; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5;

    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 60 + Math.random() * 25,
      color: ["#ed174b", "#ffb6c8", "#f7c948", "#e78ab1"][
        Math.floor(Math.random() * 4)
      ]
    });
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / 85);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();

    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;
    p.life--;
  });

  ctx.globalAlpha = 1;
  particles = particles.filter(p => p.life > 0);
}


function drawAimLine() {
  // Guidelines removed
}

function animate(time = 0) {
  const dt = Math.min((time - lastTime) / 16.67 || 1, 2);
  lastTime = time;

  frame += dt;

  drawBackground();

  // Moving target: harder to hit
  if (!won) {
    target.y =
      H * 0.5 +
      Math.sin(frame * 0.09) * H * 0.25;
  }

  drawBow();

 
if (!arrow && !won) {
  const startX = bow.x;
  const startY = bow.y;

  // Arrow moves backward together with the bowstring
  const arrowX = startX - (dragging ? pullDistance : 0);
  const arrowY = startY;

  // Arrow rotates according to cursor height
  const angle = dragging ? arrowAngle : 0;

  drawArrow(arrowX, arrowY, angle, 130);
}


  drawAimLine();

  if (arrow) {
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;


    drawArrow(
      arrow.x,
      arrow.y,
      Math.atan2(arrow.vy, arrow.vx),
      95
    );

    const hitDistance = Math.hypot(
      arrow.x - target.x,
      arrow.y - target.y
    );

    if (hitDistance < target.r * 0.85) {
      winGame();
    } else if (
      arrow.x > W + 120 ||
      arrow.y < -100 ||
      arrow.y > H + 100
    ) {
      arrow = null;
      shooting = false;
    }
  }

  drawHeart(target.x, target.y, target.r);
  drawParticles();

  requestAnimationFrame(animate);
}



function shoot() {
  if (shooting || won) return;

  shooting = true;
  
  const startX = bow.x + 48 - pullDistance;
  const startY = bow.y;

  // Shoot in the direction selected while aiming
  arrow = {
    x: startX,
    y: startY,
    vx: Math.cos(arrowAngle) * power,
    vy: Math.sin(arrowAngle) * power
  };

  // Reset the bowstring after firing
  pullDistance = 0;
}



function winGame() {
  if (won) return;

  won = true;
  shooting = false;
  arrow = null;
  
  createBurst(target.x, target.y);

  document.getElementById("hint").textContent =
    "Bullseye! You hit my heart! ❤️";

  setTimeout(() => {
    winModal.classList.add("show");
  }, 650);
}


function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

// I-update ang stretch ng tali at anggulo ng arrow
function updateBowAim(pos) {
  const startX = bow.x + 48;
  const startY = bow.y;

  // Limitahan ang stretch ng tali sa 30 pixels
  pullDistance = Math.min(
    MAX_PULL,
    Math.max(0, startX - pos.x)
  );

  // Ang taas o baba ng cursor ang kokontrol sa anggulo
  const dx = Math.max(1, pos.x - startX);
  const dy = pos.y - startY;

  arrowAngle = Math.atan2(dy, dx);

  // Limitahan ang anggulo sa 60 degrees pataas o pababa
  const maxAngle = Math.PI / 3;

  arrowAngle = Math.max(
    -maxAngle,
    Math.min(maxAngle, arrowAngle)
  );

  aim.x = pos.x;
  aim.y = pos.y;
}

canvas.addEventListener("pointerdown", event => {
  if (won || shooting) return;

  dragging = true;
  canvas.setPointerCapture(event.pointerId);

  updateBowAim(getPointerPosition(event));
});


canvas.addEventListener("pointermove", event => {
  if (!dragging || won || shooting) return;

  const pos = getPointerPosition(event);

  const startX = bow.x + 48;
  const startY = bow.y;

  // Limit the bowstring stretch
  pullDistance = Math.min(
    MAX_PULL,
    Math.max(0, startX - pos.x)
  );

  // Cursor height controls the arrow angle
  const dx = Math.max(1, target.x - startX);
  const dy = pos.y - startY;

  arrowAngle = Math.atan2(dy, dx);

  aim.x = pos.x;
  aim.y = pos.y;
});


canvas.addEventListener("pointerup", event => {
  if (!dragging || won || shooting) return;

  const pos = getPointerPosition(event);
  const startX = bow.x + 48;
  const startY = bow.y;

  // I-apply ang limit sa tali
  pullDistance = Math.min(
    MAX_PULL,
    Math.max(0, startX - pos.x)
  );

  // Kunin ang final na angle mula sa cursor
  const forwardDistance = Math.max(100, target.x - startX);
  arrowAngle = Math.atan2(
    pos.y - startY,
    forwardDistance
  );

  aim.x = pos.x;
  aim.y = pos.y;

  dragging = false;
  shoot();
});



document.getElementById("surpriseBtn").addEventListener("click", () => {
  winModal.classList.remove("show");
  messageModal.classList.add("show");
});

document.getElementById("startgame").addEventListener("click", function() {

    // Isara ang mga popup
    winModal.classList.remove("show");
    messageModal.classList.remove("show");

    // I-reset ang game state
    won = false;
    shooting = false;
    dragging = false;

    // I-reset ang arrow at effects
    arrow = null;
    particles = [];

    // I-reset ang score at attempts
    attempts = 0;
    score = 0;

    // I-reset ang animation frame
    frame = 0;

    // Ibalik ang instruction
    document.getElementById("hint").textContent =
        "Drag to aim • Release to shoot";

    // I-refresh ang game canvas
    resizeCanvas();

});


window.addEventListener("resize", resizeCanvas);

resizeCanvas();
requestAnimationFrame(animate);
