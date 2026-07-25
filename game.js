'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const $ = (id) => document.getElementById(id);

const controls = {
  socketX: $('socketX'),
  socketY: $('socketY'),
  weaponScale: $('weaponScale'),
  weaponDistance: $('weaponDistance'),
  swingAngle: $('swingAngle'),
  swingDuration: $('swingDuration'),
  waveScale: $('waveScale'),
  waveSpeed: $('waveSpeed'),
  attackRange: $('attackRange'),
  cooldown: $('cooldown'),
};

const values = {
  socketX: $('socketXValue'),
  socketY: $('socketYValue'),
  weaponScale: $('weaponScaleValue'),
  weaponDistance: $('weaponDistanceValue'),
  swingAngle: $('swingAngleValue'),
  swingDuration: $('swingDurationValue'),
  waveScale: $('waveScaleValue'),
  waveSpeed: $('waveSpeedValue'),
  attackRange: $('attackRangeValue'),
  cooldown: $('cooldownValue'),
};

const ASSET_PATHS = {
  spirit: 'assets/images/units/base/fire/spirit_t1.png',
  sword: 'assets/images/units/weapons/sword/sword_t1.png',
};

const spiritImage = new Image();
const swordImage = new Image();
spiritImage.src = ASSET_PATHS.spirit;
swordImage.src = ASSET_PATHS.sword;

const unit = {
  x: 430,
  y: 335,
  bodyWidth: 190,
  bodyHeight: 190,
  socketX: 55,
  socketY: 33,
  weaponScale: 2.00,
  weaponDistance: -20,
  swingAngle: 65 * Math.PI / 180,
  swingDuration: 0.19,
  waveScale: 1.10,
  waveSpeed: 650,
  attackRange: 245,
  cooldown: 0.9,
  lastAttackAt: -999,
  state: 'idle',
  stateTime: 0,
  aimAngle: 0,
};

const monster = {
  x: 770,
  y: 310,
  radius: 38,
  hitFlash: 0,
};

let waves = [];
let autoAttack = true;
let draggingMonster = false;
let loadedCount = 0;

function setStatus(text) {
  statusEl.textContent = text;
}

function onImageLoaded() {
  loadedCount += 1;
  if (loadedCount === 2) {
    setStatus('PNG 로드 완료. 몬스터를 드래그해 방향별로 테스트하세요.');
  }
}

function onImageError(event) {
  setStatus('이미지 로드 실패: ' + event.currentTarget.src);
}

spiritImage.addEventListener('load', onImageLoaded);
swordImage.addEventListener('load', onImageLoaded);
spiritImage.addEventListener('error', onImageError);
swordImage.addEventListener('error', onImageError);

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function getSocketPosition() {
  return {
    x: unit.x + unit.socketX,
    y: unit.y + unit.socketY,
  };
}

function getAimAngle() {
  const socket = getSocketPosition();
  return Math.atan2(monster.y - socket.y, monster.x - socket.x);
}

function isMonsterInRange() {
  return distance(unit.x, unit.y, monster.x, monster.y)
    <= unit.attackRange + monster.radius;
}

function startAttack() {
  const now = performance.now() / 1000;
  if (unit.state !== 'idle') return;
  if (now - unit.lastAttackAt < unit.cooldown) return;

  if (!isMonsterInRange()) {
    setStatus('몬스터가 공격 사거리 밖에 있습니다.');
    return;
  }

  unit.lastAttackAt = now;
  unit.state = 'swing';
  unit.stateTime = 0;
  unit.aimAngle = getAimAngle();
  setStatus('칼 휘두름 → 검기 발사');
}

function spawnWave() {
  const socket = getSocketPosition();
  const launchDistance = 62;
  waves.push({
    x: socket.x + Math.cos(unit.aimAngle) * launchDistance,
    y: socket.y + Math.sin(unit.aimAngle) * launchDistance,
    angle: unit.aimAngle,
    speed: unit.waveSpeed,
    scale: unit.waveScale,
    traveled: 0,
    maxDistance: unit.attackRange,
    hit: false,
  });
}

function update(dt) {
  unit.stateTime += dt;

  if (unit.state === 'swing' && unit.stateTime >= unit.swingDuration) {
    spawnWave();
    unit.state = 'recover';
    unit.stateTime = 0;
  } else if (unit.state === 'recover' && unit.stateTime >= 0.15) {
    unit.state = 'idle';
    unit.stateTime = 0;
  }

  for (const wave of waves) {
    const step = wave.speed * dt;
    wave.x += Math.cos(wave.angle) * step;
    wave.y += Math.sin(wave.angle) * step;
    wave.traveled += step;

    if (!wave.hit && distance(wave.x, wave.y, monster.x, monster.y)
      <= monster.radius + 20 * wave.scale) {
      wave.hit = true;
      monster.hitFlash = 0.16;
      setStatus('검기 명중!');
    }
  }

  waves = waves.filter((wave) =>
    !wave.hit && wave.traveled <= wave.maxDistance
  );

  monster.hitFlash = Math.max(0, monster.hitFlash - dt);

  if (autoAttack && unit.state === 'idle' && isMonsterInRange()) {
    startAttack();
  }
}

function getSwingOffset() {
  if (unit.state === 'idle') return -unit.swingAngle * 0.35;

  if (unit.state === 'swing') {
    const t = Math.min(1, unit.stateTime / unit.swingDuration);
    const eased = 1 - Math.pow(1 - t, 3);
    return -unit.swingAngle * 0.55 + unit.swingAngle * eased;
  }

  const t = Math.min(1, unit.stateTime / 0.15);
  return unit.swingAngle * 0.45 * (1 - t)
    - unit.swingAngle * 0.35 * t;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#dff3ff');
  gradient.addColorStop(1, '#fff1cc');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#c9dfa4';
  ctx.fillRect(0, canvas.height - 105, canvas.width, 105);

  ctx.strokeStyle = 'rgba(60, 85, 105, 0.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawRange() {
  ctx.save();
  ctx.strokeStyle = isMonsterInRange()
    ? 'rgba(76, 165, 92, .55)'
    : 'rgba(220, 80, 80, .45)';
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, unit.attackRange, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSpirit() {
  if (spiritImage.complete && spiritImage.naturalWidth > 0) {
    ctx.drawImage(
      spiritImage,
      unit.x - unit.bodyWidth / 2,
      unit.y - unit.bodyHeight / 2,
      unit.bodyWidth,
      unit.bodyHeight
    );
  }
}

function drawSword() {
  if (!swordImage.complete || swordImage.naturalWidth === 0) return;

  const socket = getSocketPosition();
  const angle = unit.aimAngle + getSwingOffset();
  const weaponHeight = 48 * unit.weaponScale;
  const weaponWidth = 20 * unit.weaponScale;

  ctx.save();
  ctx.translate(socket.x, socket.y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.translate(0, -unit.weaponDistance);
  ctx.drawImage(
    swordImage,
    -weaponWidth / 2,
    -weaponHeight,
    weaponWidth,
    weaponHeight
  );
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(255,80,55,.8)';
  ctx.beginPath();
  ctx.arc(socket.x, socket.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWave(wave) {
  ctx.save();
  ctx.translate(wave.x, wave.y);
  ctx.rotate(wave.angle);

  const s = wave.scale;
  const gradient = ctx.createLinearGradient(-28*s, 0, 35*s, 0);
  gradient.addColorStop(0, 'rgba(255,245,180,0)');
  gradient.addColorStop(.4, 'rgba(255,230,95,.9)');
  gradient.addColorStop(1, 'rgba(255,120,35,.15)');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 12 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 34 * s, -0.92, 0.92);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,230,.95)';
  ctx.lineWidth = 3.2 * s;
  ctx.beginPath();
  ctx.arc(0, 0, 34 * s, -0.92, 0.92);
  ctx.stroke();

  ctx.restore();
}

function drawMonster() {
  ctx.save();
  ctx.translate(monster.x, monster.y);

  if (monster.hitFlash > 0) {
    ctx.scale(1.16, 0.88);
  }

  ctx.fillStyle = monster.hitFlash > 0 ? '#fff6d4' : '#d95362';
  ctx.strokeStyle = '#7b2431';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.ellipse(0, 3, monster.radius, monster.radius * .82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-13, -5, 7, 0, Math.PI * 2);
  ctx.arc(13, -5, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d1c25';
  ctx.beginPath();
  ctx.arc(-12, -4, 3, 0, Math.PI * 2);
  ctx.arc(12, -4, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = '#40252c';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('드래그 가능', monster.x, monster.y - monster.radius - 14);
}

function drawInfo() {
  ctx.save();
  ctx.fillStyle = 'rgba(20,27,40,.82)';
  ctx.fillRect(18, 18, 270, 82);
  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`상태: ${unit.state}`, 32, 45);
  ctx.fillText(`사거리: ${unit.attackRange}px`, 32, 68);
  ctx.fillText(`대상: ${isMonsterInRange() ? '사거리 안' : '사거리 밖'}`, 32, 91);
  ctx.restore();
}

function draw() {
  drawBackground();
  drawRange();
  drawSpirit();
  drawSword();
  for (const wave of waves) drawWave(wave);
  drawMonster();
  drawInfo();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}

canvas.addEventListener('pointerdown', (event) => {
  const p = canvasPoint(event);
  if (distance(p.x, p.y, monster.x, monster.y) <= monster.radius + 16) {
    draggingMonster = true;
    canvas.setPointerCapture(event.pointerId);
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (!draggingMonster) return;
  const p = canvasPoint(event);
  monster.x = Math.max(monster.radius, Math.min(canvas.width - monster.radius, p.x));
  monster.y = Math.max(monster.radius, Math.min(canvas.height - monster.radius, p.y));
});

canvas.addEventListener('pointerup', () => {
  draggingMonster = false;
});

canvas.addEventListener('pointercancel', () => {
  draggingMonster = false;
});

function bindRange(name, formatter, apply) {
  controls[name].addEventListener('input', () => {
    const value = Number(controls[name].value);
    apply(value);
    values[name].textContent = formatter(value);
  });
}

bindRange('socketX', v => `${v}`, v => unit.socketX = v);
bindRange('socketY', v => `${v}`, v => unit.socketY = v);
bindRange('weaponScale', v => `${v}%`, v => unit.weaponScale = v / 100);
bindRange('weaponDistance', v => `${v}`, v => unit.weaponDistance = v);
bindRange('swingAngle', v => `${v}°`, v => unit.swingAngle = v * Math.PI / 180);
bindRange('swingDuration', v => `${v}ms`, v => unit.swingDuration = v / 1000);
bindRange('waveScale', v => `${v}%`, v => unit.waveScale = v / 100);
bindRange('waveSpeed', v => `${v}px/s`, v => unit.waveSpeed = v);
bindRange('attackRange', v => `${v}px`, v => unit.attackRange = v);
bindRange('cooldown', v => `${v}ms`, v => unit.cooldown = v / 1000);

$('attackBtn').addEventListener('click', startAttack);

$('autoBtn').addEventListener('click', () => {
  autoAttack = !autoAttack;
  $('autoBtn').textContent = `자동 공격: ${autoAttack ? '켜짐' : '꺼짐'}`;
});

$('resetBtn').addEventListener('click', () => {
  const defaults = {
    socketX: 50,
    socketY: 32,
    weaponScale: 375,
    weaponDistance: 2,
    swingAngle: 95,
    swingDuration: 190,
    waveScale: 110,
    waveSpeed: 650,
    attackRange: 340,
    cooldown: 900,
  };

  for (const [name, value] of Object.entries(defaults)) {
    controls[name].value = value;
    controls[name].dispatchEvent(new Event('input'));
  }

  monster.x = 770;
  monster.y = 310;
  waves = [];
  unit.state = 'idle';
  setStatus('기본값을 복원했습니다.');
});

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

unit.aimAngle = getAimAngle();
requestAnimationFrame(loop);
