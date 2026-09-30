// 実際のdeformへ点を渡し、一律回転ではない曲がりと形状の安定性を検査。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync(process.argv[2], 'utf8');
const defaults = vm.runInNewContext(app.slice(app.indexOf('const P={'), app.indexOf('const DEFAULTS=')) + '\nP;');
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = value => {const t = clamp(value, 0, 1); return t * t * (3 - 2 * t);};
const context = {
  clamp, smooth, auto: {phys: false}, FS: 1, FRONTISH: {},
  NP: {cx: 640, cy: 500}, BP: {cx: 640, cy: 1280}, FC: {x: 640, y: 300},
  A: {face: {x0: 540, x1: 740, y0: 200, y1: 400}, mouth: {x0: 600, x1: 680}, neckTop: 450, neckBottom: 600},
  CHEST: {cx: 640, cy: 700, rx: 120, ry: 100}, bounce: {dy: 0},
};
vm.createContext(context);
vm.runInContext(app.slice(app.indexOf('function deform(L,e){'), app.indexOf('function updateSprings(')) + '\nthis.deform=deform;', context);
function shape(points, changes, group = 'body', bn = 'topwear') {
  const L = {base: Float64Array.from(points), cur: new Float64Array(points.length), group, bn, depth: 1, x: 300, y: 500, w: 680, h: 780};
  const e = {...defaults, breath: 0, breathHead: 0, torsoYaw: 0, torsoTilt: 0, torsoPitch: 0, ...changes};
  context.deform(L, e);
  assert.ok(Array.from(L.cur).every(Number.isFinite));
  return Array.from(L.cur);
}
const points = [400, 600, 880, 600, 480, 760, 800, 760, 480, 940, 800, 940, 480, 1100, 800, 1100];
assert.deepEqual(shape(points, {}), points, '静止状態は元形状を保持');
const tilted = shape(points, {angleZ: 0.8, torsoTilt: 0.6, body: 0.22});
assert.notEqual(tilted[1], tilted[3], '左右の肩を別々の高さへ');
assert.ok(Math.abs(tilted[0] - points[0]) > Math.abs(tilted[4] - points[4]), '肩は胸より大きく動く');
assert.deepEqual(tilted.slice(8), points.slice(8), '腰以下に一律回転をかけない');
const distance = (array, a, b) => Math.hypot(array[a] - array[b], array[a + 1] - array[b + 1]);
assert.ok(Math.abs(distance(tilted, 0, 4) - distance(points, 0, 4)) > 0.5, '剛体回転ではなく胴体が曲がる');
const right = shape(points, {angleX: 0.6, torsoYaw: 0.6});
const left = shape(points, {angleX: -0.6, torsoYaw: -0.6});
assert.ok(right[0] > points[0] && left[2] < points[2], '左右向きで胴体も左右へ追従');
assert.ok(right[2] - right[0] < points[2] - points[0], '左右向きで胴体の見かけの幅を圧縮');
assert.notEqual(right[1], right[3], '肩の見かけの前後差を高さへ反映');
assert.ok(Math.abs(right[0] + left[2] - 1280) < 1e-8);
assert.ok(Math.abs(right[1] - left[3]) < 1e-8, '左右反転時に対称な形状');
const head = shape([540, 300, 740, 300], {angleX: 1}, 'head', 'headwear');
assert.ok(head[2] - head[0] < 200 && head[2] - head[0] > 180, '顔の幅を控えめに圧縮');
const grid = [];
for (let y = 300; y <= 1200; y += 100) for (let x = 240; x <= 1040; x += 100) grid.push(x, y);
const area = (p, a, b, c) => (p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[b + 1] - p[a + 1]) * (p[c] - p[a]);
for (const yaw of [-1, 0, 1]) for (const tilt of [-1, 0, 1]) {
  const warped = shape(grid, {angleX: yaw, torsoYaw: yaw, angleZ: tilt, torsoTilt: tilt, body: tilt, torsoPitch: tilt});
  for (let row = 0; row < 9; row++) for (let col = 0; col < 8; col++) {
    const a = (row * 9 + col) * 2, b = a + 2, c = a + 18, d = c + 2;
    assert.ok(area(warped, a, b, c) > 0 && area(warped, b, d, c) > 0, '最大入力でも三角形を裏返さない');
  }
}
process.stdout.write('肩・胸・腰の分節変形、左右向きの奥行き、頭幅、最大入力の形状: 合格\n');
const drape = vm.runInNewContext(app.slice(app.indexOf('function drapeMask('), app.indexOf('function prepareLayers(')) + '\ndrapeMask;', {smooth});
assert.equal(drape(650, 800), 0, '胸の前身頃を保持');
assert.equal(drape(390, 760), 1, '左の垂れ布を奥へ');
assert.equal(drape(910, 760), 1, '右の垂れ布を奥へ');
assert.equal(drape(390, 620), 0, '肩と襟を分割しない');
assert.equal(drape(390, 1200), 0, '下側の衣装を分割しない');
for (let y = 700; y <= 1118; y += 10) for (let x = 250; x <= 1050; x += 10) {
  const mask = drape(x, y);
  assert.ok(mask >= 0 && mask <= 1);
  assert.equal(mask, drape(1300 - x, y));
}
assert.ok(app.includes('items.unshift({L:L.drapeBack,alpha,clip:null})'));
process.stdout.write('垂れ布と前身頃のマスク範囲・左右対称・袖の背面への描画: 合格\n');
