// カメラ実機と分け、固定ソースの片目検出・追従・設定引継ぎを確認する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const app = fs.readFileSync(process.argv[2], 'utf8');
const FF = require(path.resolve(process.argv[3]));
const extract = (start, end) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start)));
const schema = vm.runInNewContext(extract('const PREF_SCHEMA=', 'let prefs=') + '\nPREF_SCHEMA;');
const options = Object.fromEntries(Object.entries(schema).map(([key, spec]) => [key, spec.at(-1)]));
assert.equal(options.linkEyes, false);
assert.equal(options.headGain, 1.6);
assert.equal(options.smoothing, 0.65);
const neutral = FF.DEFAULT_NEUTRAL;
for (const side of ['L', 'R']) {
  const measurement = {...neutral, hasIris: false, ['eye' + side]: 0.01};
  const out = FF.toParams(measurement, neutral, options);
  assert.equal(out['e' + side], 0, side + 'は閉じる');
  assert.equal(out[side === 'L' ? 'eR' : 'eL'], 1, '反対の目は開いたまま');
}
const old = FF.toParams({...neutral, yaw: 0.05, pitch: neutral.pitch + 0.04, roll: 0.10, hasIris: false}, neutral, {...options, headGain: 1});
const next = FF.toParams({...neutral, yaw: 0.05, pitch: neutral.pitch + 0.04, roll: 0.10, hasIris: false}, neutral, options);
for (const key of ['ax', 'ay', 'az']) assert.ok(Math.abs(next[key] / old[key] - 1.6) < 1e-9);
const upgrade = vm.runInNewContext(extract('function upgradeMotionPrefs(', 'if(upgradeMotionPrefs') + '\nupgradeMotionPrefs;');
const existing = {headGain: 1, smoothing: 0.5, linkEyes: true, calibration: {yaw: 0.1}};
assert.equal(upgrade(existing), true);
assert.equal(existing.headGain, 1.6);
assert.equal(existing.linkEyes, false);
assert.equal(existing.calibration.yaw, 0.1);
existing.linkEyes = true;
assert.equal(upgrade(existing), false);
assert.equal(existing.linkEyes, true, '移行後のユーザー変更を保持');
const custom = {headGain: 1.9, smoothing: 0.8, linkEyes: true};
upgrade(custom);
assert.equal(custom.headGain, 1.9);
assert.equal(custom.smoothing, 0.8);
const animateSource = extract('function animate(now,dt){', '// ---------- render loop');
function response(fps, seconds) {
  const T = {angleX: 0, angleY: 0, angleZ: 0, body: 0, eyeOpenL: 1, eyeOpenR: 1, eyeX: 0, eyeY: 0, mouthOpen: 0, mouthForm: 0, brow: 0, physAmp: 2, soft: 2, fhAmp: 2, fhSoft: 0.4};
  const context = {
    T, cur: {...T}, bodyFollow: {yaw: 0, tilt: 0, pitch: 0}, anchorMode: false, OBS_MODE: false,
    auto: {cam: true}, cam: {live: true, ax: 0.6, ay: 0, az: 0, eL: 0, eR: 1, ex: 0, ey: 0, mo: 0.7},
    performance: {now: () => 3000}, lastTrackingAt: 3000,
    clamp: (value, low, high) => Math.max(low, Math.min(high, value)),
    RT: {clamp: (value, low, high) => Math.max(low, Math.min(high, value))},
    parameterRanges: Object.fromEntries(Object.keys(T).map(key => [key, key.startsWith('eyeOpen') || key === 'mouthOpen' ? [0, 1] : [-3, 3]])),
    camPhysScale: 1, updateSprings: () => {},
  };
  vm.createContext(context);
  vm.runInContext(animateSource + '\nthis.step=animate;', context);
  let result;
  for (let index = 0; index < Math.round(seconds * fps); index++) result = context.step(3000, 1 / fps);
  return result;
}
const first = response(60, 1 / 60);
assert.ok(first.angleX > 0 && first.angleX < 0.1, '顔の向きを瞬間移動させない');
assert.ok(first.eyeOpenL < 1 && first.eyeOpenR === 1, '追従後も片目だけ閉じる');
const at30 = response(30, 0.5), at60 = response(60, 0.5);
for (const key of ['angleX', 'body', 'eyeOpenL', 'mouthOpen']) assert.ok(Math.abs(at30[key] - at60[key]) < 1e-8, key + 'は描画間隔に依存しない');
assert.ok(at60.angleX > 0.58 && at60.angleX < 0.6);
assert.ok(at60.eyeOpenL < 0.001 && at60.eyeOpenR === 1);
assert.ok(at60.torsoYaw > 0 && at60.torsoYaw < at60.angleX, '胴体の左右向きが頭を遅れて追う');
assert.ok(Math.abs(at30.torsoYaw - at60.torsoYaw) < 0.01, '描画間隔が違っても胴体の追従は近い');
assert.ok(app.includes('const az=e.angleZ*0.14'));
assert.ok(app.includes('e.angleX*(26+74*(dd-1))'));
assert.ok(Number.isFinite(at60.swayBody) && Math.abs(at60.swayBody) <= 4);
assert.ok(Number.isFinite(at60.swayHead) && Math.abs(at60.swayHead) <= 4.5);
assert.notEqual(at60.swayBody / 4, at60.swayHead / 4.5, '呼吸の横揺れは頭を少し遅らせる');
process.stdout.write('片目検出・小さな動きの増幅・なめらかな追従・30/60fps間隔・既存設定引継ぎ: 合格\n');
