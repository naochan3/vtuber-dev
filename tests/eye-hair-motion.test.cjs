// 実際の開閉処理とばね処理へ合成入力を渡し、再開眼と毛束の応答を検査。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const app = fs.readFileSync(process.argv[2], 'utf8');
const RT = require(path.resolve(process.argv[3]));
const extract = (start, end) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start)));
const defaults = vm.runInNewContext(extract('const P={', 'const DEFAULTS=') + '\nP;');
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const eyes = {
  T: {...defaults}, cur: {...defaults}, bodyFollow: {yaw: 0, tilt: 0, pitch: 0},
  auto: {blink: true}, anchorMode: false, OBS_MODE: false, cam: {}, activePreset: null,
  performance: {now: () => 3000}, blinkT: 0, blinkVariant: 1, nextBlink: Infinity,
  RT, clamp, parameterRanges: Object.fromEntries(Object.keys(defaults).map(key => [key, [-10, 10]])),
  camPhysScale: 1, updateSprings: () => {},
};
vm.createContext(eyes);
vm.runInContext(extract('function animate(now,dt){', '// ---------- render loop') + '\nthis.step=animate;', eyes);
let closed = false, reopened = false;
for (let frame = 0; frame < 120; frame++) {
  const e = eyes.step(3000 + frame * 1000 / 60, 1 / 60);
  if (e.eyeOpenL < 0.05) closed = true;
  if (closed && e.eyeOpenL > 0.99) reopened = true;
  assert.equal(e.irisBounceX, 1);
  assert.equal(e.irisBounceY, 1);
}
assert.ok(closed && reopened, '目を閉じて開き直す間、瞳の演出による伸縮がない');
assert.ok(!app.includes('irisBounceT') && !app.includes('blinkBounceStarted'));
function response(fps) {
  const layers = ['front hair', 'side hair', 'back hair'].map((bn, index) => ({
    bn, group: 'head', depth: 1 + (1 - index) * 0.12,
    strands: [{x: 570 + index * 60, rootY: 180, tipY: 300 + index * 200}],
    spr: [{stiff: {x: 0, v: 0, dx: 0}, soft: {x: 0, v: 0, dx: 0}, vertical: {x: 0, v: 0, dy: 0}, phase: index}],
  }));
  const context = {layers, RT, clamp, FS: 1, NP: {cx: 640, cy: 500}, FC: {y: 300}, bounce: {x: 0, v: 0}};
  vm.createContext(context);
  vm.runInContext(extract('function updateSprings(', '// Still pose') + '\nthis.step=updateSprings;', context);
  const neutral = {...defaults, breath: 0, breathHead: 0};
  context.step(neutral, 0, 1 / fps, false);
  let moving;
  const release = [];
  for (let frame = 0; frame < fps * 4; frame++) {
    const e = frame < fps ? {...neutral, angleX: 0.6, angleZ: 0.4, angleY: 0.3} : neutral;
    context.step(e, frame / fps, 1 / fps, false);
    const values = layers.map(L => [L.spr[0].soft.dx, L.spr[0].vertical.dy]);
    assert.ok(values.flat().every(Number.isFinite));
    if (frame === Math.round(fps * 0.15)) moving = values;
    if (frame >= fps) release.push(values);
  }
  for (let index = 0; index < 3; index++) {
    const x = release.map(values => values[index][0]);
    const signs = x.filter(value => Math.abs(value) > 0.01).map(Math.sign);
    assert.equal(new Set(signs).size, 1, '止めた後の繰り返す跳ね返りがない');
    assert.ok(Math.abs(x.at(-1)) < 0.05, '停止後に収束');
  }
  assert.notEqual(moving[0][0], moving[2][0], '前髪と後ろ髪の応答を分ける');
  assert.notEqual(moving[0][1], moving[2][1], '根元位置と深度で上下の反応も分ける');
  return moving;
}
const at30 = response(30), at60 = response(60);
for (let index = 0; index < 3; index++) assert.ok(Math.abs(at30[index][0] - at60[index][0]) < 0.5);
process.stdout.write('再開眼時の瞳の安定、前・横・後ろ髪の応答差、上下慣性、停止後の収束: 合格\n');
