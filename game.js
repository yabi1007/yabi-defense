'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const controls = {
  socketX: document.getElementById('socketX'),
  socketY: document.getElementById('socketY'),
  weaponScale: document.getElementById('weaponScale'),
  weaponDistance: document.getElementById('weaponDistance'),
};

const values = {
  socketX: document.getElementById('socketXValue'),
  socketY: document.getElementById('socketYValue'),
  weaponScale: document.getElementById('weaponScaleValue'),
  weaponDistance: document.getElementById('weaponDistanceValue'),
};

/*
  현재 프로젝트 폴더 구조 기준 경로입니다.

  assets/images/units/base/fire/spirit_t1.png
  assets/images/units/weapons/sword/sword_t1.png
*/
const ASSET_PATHS = {
  spirit: 'assets/images/units/base/fire/spirit_t1.png',
  sword: 'assets/images/units/weapons/sword/sword_t1.png',
};

const spiritImage = new Image();
const swordImage = new Image();

spiritImage.src = ASSET_PATHS.spirit;
swordImage.src = ASSET_PATHS.sword;

const unit = {
  x: canvas.width / 2,
  y: canvas.height / 2 + 30,

  // 캐릭터를 화면에 그릴 크기입니다.
  bodyWidth: 180,
  bodyHeight: 180,

  // 몸 중심을 기준으로 한 손 소켓 좌표입니다.
  socketX: Number(controls.socketX.value),
  socketY: Number(controls.socketY.value),

  // 48x20 원본 검 이미지를 확대해서 표시합니다.
  weaponScale: Number(controls.weaponScale.value) / 100,
  weaponDistance: Number(controls.weaponDistance.value),
};

const pointer = {
  x: canvas.width * 0.75,
  y: canvas.height * 0.45,
};

let loadedCount = 0;
let loadFailed = false;

function handleImageLoaded() {
  loadedCount += 1;

  if (loadedCount === 2) {
    statusEl.textContent = '이미지 로드 완료. 마우스를 움직여 칼 방향을 확인하세요.';
  }
}

function handleImageError(event) {
  loadFailed = true;
  const failedPath = event.currentTarget.src;
  statusEl.textContent =
    '이미지를 찾지 못했습니다. 파일명과 assets 폴더 위치를 확인하세요: ' +
    failedPath;
}

spiritImage.addEventListener('load', handleImageLoaded);
swordImage.addEventListener('load', handleImageLoaded);
spiritImage.addEventListener('error', handleImageError);
swordImage.addEventListener('error', handleImageError);

function updatePointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  pointer.x = (clientX - rect.left) * scaleX;
  pointer.y = (clientY - rect.top) * scaleY;
}

canvas.addEventListener('pointermove', (event) => {
  updatePointer(event.clientX, event.clientY);
});

canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture(event.pointerId);
  updatePointer(event.clientX, event.clientY);
});

function bindRange(controlName, formatter = (value) => value) {
  controls[controlName].addEventListener('input', () => {
    const numericValue = Number(controls[controlName].value);
    unit[controlName] =
      controlName === 'weaponScale' ? numericValue / 100 : numericValue;

    values[controlName].textContent = formatter(numericValue);
  });
}

bindRange('socketX');
bindRange('socketY');
bindRange('weaponScale', (value) => `${value}%`);
bindRange('weaponDistance');

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#dff3ff');
  gradient.addColorStop(1, '#f8f2d2');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#c9dda4';
  ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

  ctx.strokeStyle = 'rgba(66, 94, 115, 0.12)';
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

function drawSpirit() {
  if (!spiritImage.complete || spiritImage.naturalWidth === 0) {
    drawMissingAssetPlaceholder(
      unit.x - unit.bodyWidth / 2,
      unit.y - unit.bodyHeight / 2,
      unit.bodyWidth,
      unit.bodyHeight,
      '불정령'
    );
    return;
  }

  ctx.drawImage(
    spiritImage,
    unit.x - unit.bodyWidth / 2,
    unit.y - unit.bodyHeight / 2,
    unit.bodyWidth,
    unit.bodyHeight
  );
}

function getSocketPosition() {
  return {
    x: unit.x + unit.socketX,
    y: unit.y + unit.socketY,
  };
}

function drawWeapon() {
  const socket = getSocketPosition();
  const angle = Math.atan2(pointer.y - socket.y, pointer.x - socket.x);

  /*
    검 PNG는 세로형(48x20)입니다.
    화면에서 마우스 방향을 향하게 하기 위해 기본 이미지 방향에 90도를 더합니다.
    검의 회전축은 이미지 하단 중앙, 즉 손잡이 끝으로 설정합니다.
  */
  const weaponHeight = 48 * unit.weaponScale;
  const weaponWidth = 20 * unit.weaponScale;

  ctx.save();
  ctx.translate(socket.x, socket.y);
  ctx.rotate(angle + Math.PI / 2);

  // 손에서 검이 조금 떨어져 보일 때 조절하는 거리입니다.
  ctx.translate(0, -unit.weaponDistance);

  if (!swordImage.complete || swordImage.naturalWidth === 0) {
    ctx.fillStyle = '#c8d0dc';
    ctx.strokeStyle = '#46506a';
    ctx.lineWidth = 2;
    ctx.fillRect(-weaponWidth / 2, -weaponHeight, weaponWidth, weaponHeight);
    ctx.strokeRect(-weaponWidth / 2, -weaponHeight, weaponWidth, weaponHeight);
  } else {
    ctx.drawImage(
      swordImage,
      -weaponWidth / 2,
      -weaponHeight,
      weaponWidth,
      weaponHeight
    );
  }

  ctx.restore();

  drawSocketGuide(socket, angle);
}

function drawSocketGuide(socket, angle) {
  ctx.save();

  ctx.strokeStyle = 'rgba(255, 70, 70, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);

  ctx.beginPath();
  ctx.arc(socket.x, socket.y, 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(socket.x, socket.y);
  ctx.lineTo(
    socket.x + Math.cos(angle) * 55,
    socket.y + Math.sin(angle) * 55
  );
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = '#c53d3d';
  ctx.font = '13px Arial';
  ctx.fillText('손 소켓', socket.x + 12, socket.y - 10);

  ctx.restore();
}

function drawPointerGuide() {
  ctx.save();
  ctx.strokeStyle = 'rgba(45, 91, 160, 0.5)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pointer.x - 14, pointer.y);
  ctx.lineTo(pointer.x + 14, pointer.y);
  ctx.moveTo(pointer.x, pointer.y - 14);
  ctx.lineTo(pointer.x, pointer.y + 14);
  ctx.stroke();

  ctx.restore();
}

function drawMissingAssetPlaceholder(x, y, width, height, label) {
  ctx.save();
  ctx.fillStyle = '#ffe4e4';
  ctx.strokeStyle = '#d75c5c';
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#8f3131';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label + ' 이미지 없음', x + width / 2, y + height / 2);
  ctx.restore();
}

function drawInfo() {
  const socket = getSocketPosition();

  ctx.save();
  ctx.fillStyle = 'rgba(20, 29, 45, 0.78)';
  ctx.fillRect(18, 18, 270, 88);

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.fillText(`소켓 X: ${unit.socketX}`, 32, 45);
  ctx.fillText(`소켓 Y: ${unit.socketY}`, 32, 67);
  ctx.fillText(`칼 배율: ${Math.round(unit.weaponScale * 100)}%`, 150, 45);
  ctx.fillText(
    `소켓 좌표: ${Math.round(socket.x)}, ${Math.round(socket.y)}`,
    32,
    89
  );
  ctx.restore();
}

function gameLoop() {
  drawBackground();
  drawSpirit();
  drawWeapon();
  drawPointerGuide();
  drawInfo();

  requestAnimationFrame(gameLoop);
}

gameLoop();
