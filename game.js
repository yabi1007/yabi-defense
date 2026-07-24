'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const ASSET_PATHS = {
  spirit: 'assets/images/units/base/fire/spirit_t1.png',
  sword: 'assets/images/units/weapons/sword/sword_t1.png',
};

const spiritImage = new Image();
const swordImage = new Image();

spiritImage.src = ASSET_PATHS.spirit;
swordImage.src = ASSET_PATHS.sword;

const unit = {
  x: 450,
  y: 310,

  bodyWidth: 180,
  bodyHeight: 180,

  // 사용자가 확정한 값
  socketX: 50,
  socketY: 32,
  weaponScale: 2.5,

  attackRange: 180,
  attackCooldown: 0.9,
  attackDuration: 0.32,

  cooldownTimer: 0,
  attackTimer: 0,
  isAttacking: false,
};

const monster = {
  x: 720,
  y: 310,
  radius: 34,
  dragging: false,
  alive: true,
};

let previousTime = performance.now();
let loadedCount = 0;

function onLoaded() {
  loadedCount += 1;
  if (loadedCount === 2) {
    statusEl.textContent =
      '준비 완료. 몬스터를 드래그해 공격 범위 안으로 넣어보세요.';
  }
}

function onError(event) {
  statusEl.textContent =
    '이미지를 찾지 못했습니다. 경로를 확인하세요: ' +
    event.currentTarget.src;
}

spiritImage.addEventListener('load', onLoaded);
swordImage.addEventListener('load', onLoaded);
spiritImage.addEventListener('error', onError);
swordImage.addEventListener('error', onError);

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function isMonsterInRange() {
  if (!monster.alive) return false;

  return (
    distance(unit.x, unit.y, monster.x, monster.y) <=
    unit.attackRange + monster.radius
  );
}

function startAttack() {
  if (unit.isAttacking) return;

  unit.isAttacking = true;
  unit.attackTimer = 0;
  unit.cooldownTimer = unit.attackCooldown;
}

function update(deltaTime) {
  if (unit.cooldownTimer > 0) {
    unit.cooldownTimer -= deltaTime;
  }

  if (unit.isAttacking) {
    unit.attackTimer += deltaTime;

    if (unit.attackTimer >= unit.attackDuration) {
      unit.isAttacking = false;
      unit.attackTimer = 0;
    }
  }

  // 핵심: 몬스터가 범위 안에 있을 때만 자동 공격
  if (
    isMonsterInRange() &&
    !unit.isAttacking &&
    unit.cooldownTimer <= 0
  ) {
    startAttack();
  }
}

function getAttackProgress() {
  if (!unit.isAttacking) return 0;

  const rawProgress = Math.min(
    unit.attackTimer / unit.attackDuration,
    1
  );

  // 처음은 빠르고 마지막은 부드럽게 감속
  return 1 - Math.pow(1 - rawProgress, 3);
}

function getWeaponAngle() {
  const baseAngle = Math.PI / 4;

  if (!unit.isAttacking) {
    return baseAngle;
  }

  return baseAngle + getAttackProgress() * Math.PI * 2;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#dff3ff');
  gradient.addColorStop(1, '#f8f2d2');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#c9dda4';
  ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
}

function drawAttackRange() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, unit.attackRange, 0, Math.PI * 2);

  ctx.fillStyle = isMonsterInRange()
    ? 'rgba(255, 126, 67, 0.10)'
    : 'rgba(70, 130, 180, 0.08)';

  ctx.strokeStyle = isMonsterInRange()
    ? 'rgba(255, 92, 50, 0.65)'
    : 'rgba(60, 110, 170, 0.45)';

  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
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
  } else {
    ctx.fillStyle = '#ff8b42';
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, 70, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSlashEffect(socketX, socketY, angle) {
  if (!unit.isAttacking) return;

  const progress = getAttackProgress();
  const alpha = Math.sin(progress * Math.PI) * 0.55;

  ctx.save();
  ctx.translate(socketX, socketY);
  ctx.rotate(angle);

  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(0, 0, 92, -1.25, 0.2);
  ctx.stroke();

  ctx.restore();
}

function drawWeapon() {
  const socketX = unit.x + unit.socketX;
  const socketY = unit.y + unit.socketY;
  const angle = getWeaponAngle();

  const weaponHeight = 48 * unit.weaponScale;
  const weaponWidth = 20 * unit.weaponScale;

  drawSlashEffect(socketX, socketY, angle);

  ctx.save();
  ctx.translate(socketX, socketY);
  ctx.rotate(angle + Math.PI / 2);

  if (swordImage.complete && swordImage.naturalWidth > 0) {
    ctx.drawImage(
      swordImage,
      -weaponWidth / 2,
      -weaponHeight,
      weaponWidth,
      weaponHeight
    );
  } else {
    ctx.fillStyle = '#d9dee8';
    ctx.fillRect(
      -weaponWidth / 2,
      -weaponHeight,
      weaponWidth,
      weaponHeight
    );
  }

  ctx.restore();
}

function drawMonster() {
  ctx.save();

  ctx.fillStyle = isMonsterInRange() ? '#ef5350' : '#ba3f3f';
  ctx.beginPath();
  ctx.arc(monster.x, monster.y, monster.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(monster.x - 11, monster.y - 6, 6, 0, Math.PI * 2);
  ctx.arc(monster.x + 11, monster.y - 6, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(monster.x - 11, monster.y - 6, 2.5, 0, Math.PI * 2);
  ctx.arc(monster.x + 11, monster.y - 6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a1e1e';
  ctx.fillRect(monster.x - 12, monster.y + 10, 24, 5);

  ctx.restore();
}

function drawInfo() {
  const inRange = isMonsterInRange();

  ctx.save();
  ctx.fillStyle = 'rgba(20,29,45,0.82)';
  ctx.fillRect(18, 18, 310, 100);

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.fillText(`몬스터 감지: ${inRange ? '범위 안' : '범위 밖'}`, 32, 45);
  ctx.fillText(
    `공격 상태: ${unit.isAttacking ? '회전 공격 중' : '대기'}`,
    32,
    68
  );
  ctx.fillText(`공격 범위: ${unit.attackRange}px`, 32, 91);

  ctx.restore();
}

function render() {
  drawBackground();
  drawAttackRange();
  drawSpirit();
  drawWeapon();
  drawMonster();
  drawInfo();
}

function gameLoop(currentTime) {
  const deltaTime = Math.min((currentTime - previousTime) / 1000, 0.05);
  previousTime = currentTime;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

function getCanvasPointer(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

canvas.addEventListener('pointerdown', (event) => {
  const pointer = getCanvasPointer(event);

  if (
    distance(pointer.x, pointer.y, monster.x, monster.y) <=
    monster.radius + 15
  ) {
    monster.dragging = true;
    canvas.setPointerCapture(event.pointerId);
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (!monster.dragging) return;

  const pointer = getCanvasPointer(event);
  monster.x = pointer.x;
  monster.y = pointer.y;
});

canvas.addEventListener('pointerup', () => {
  monster.dragging = false;
});

canvas.addEventListener('pointercancel', () => {
  monster.dragging = false;
});

requestAnimationFrame(gameLoop);
