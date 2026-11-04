#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 逐段抽帧 + 网格联络表（contact sheet），验收「图文相符」的取证载体
// ---------------------------------------------------------------------------
// 为什么要拼联络表：几十段一张张读图既慢又看不出整体一致性；等比缩小拼成网格后，
// 一屏就能核对「每段画面是不是目标页面、中文有没有渲染成方块、有没有报错弹窗」。
// 单张缩略图宽度低于 ~460px 时中文看不清，故默认 640。
//
// 两种模式：
//   ① 成片 + timeline 逐段抽帧（默认取「该段旁白说完那一刻」的末秒帧）
//      node contact-sheet.mjs <成片.mp4> <输出目录> --timeline <timeline.json> [--grid 4x5] [--at tail|mid]
//      取末秒而非中段：末秒最能暴露「话说完了画面还没跟上」。
//   ② 视频目录批量抽帧（卡片、单段 clip 均可）
//      node contact-sheet.mjs <视频目录> <输出目录> [--grid 4x5] [--at 2.0] [--prefix card-]
//      卡片帧取淡入已结束、淡出未开始的时刻（常为 2.0s），排版最接近成片观感。
//
// 退出码：0 成功；1 有帧抽取失败或时间轴为负；2 参数错误或时间轴不可用。
// timeline 字段取值契约与别名表见同目录 timeline.mjs（与体检脚本共用一套，不会两边各猜一套字段）。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadTimeline, describeTimeline, filmTimeSec } from './timeline.mjs';

const args = process.argv.slice(2);
const src = args[0], dstDir = args[1];
if (!src || !dstDir || !fs.existsSync(src)) {
    console.error('用法：node contact-sheet.mjs <成片.mp4|视频目录> <输出目录> [--timeline t.json] [--grid 4x5] [--at tail|mid|秒数] [--prefix 前缀]');
    process.exit(2);
}
const opt = (name, dft) => {
    const i = args.indexOf('--' + name);
    return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : dft;
};
const grid = (opt('grid', '4x5')).split('x').map(Number);   // [列数, 每表行数]
const COLS = grid[0], ROWS = grid[1];
const CELL_W = Number(opt('cell-w', 640));
const PREFIX = opt('prefix', '');
const isFilm = fs.statSync(src).isFile();
fs.mkdirSync(dstDir, { recursive: true });

const ff = (a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: ['ignore', 'pipe', 'pipe'] });
const probeH = (f) => {
    const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=height,width', '-print_format', 'json', f], { encoding: 'utf8' }));
    const s = j.streams?.[0];
    if (!s) throw new Error(`探测不到视频流：${f}`);
    return s;
};

// ── 组装待抽帧清单：{ label, source, t } ──────────────────────────
const jobs = [];
if (isFilm) {
    const tlPath = opt('timeline', '');
    if (!tlPath || !fs.existsSync(tlPath)) {
        console.error('成片模式必须给 --timeline <timeline.json>，否则无法按段落取帧');
        process.exit(2);
    }
    let tl;
    try { tl = loadTimeline(tlPath); }
    catch (e) { console.error(`时间轴不可用：${e.message}`); process.exit(2); }
    console.log(describeTimeline(tl));
    const at = opt('at', 'tail');
    const atSec = Number(at);
    if (at !== 'tail' && at !== 'mid' && !Number.isFinite(atSec)) { console.error(`--at 只接受 tail / mid 或秒数，实际收到「${at}」`); process.exit(2); }
    for (const s of tl.segments) {
        // 末秒 = 旁白说完那一刻（最能暴露「话说完了画面还没跟上」）；中段用于对比「话说一半」的画面
        let flowMs;
        if (at === 'mid') flowMs = s.startMs + s.actualMs / 2;
        else if (at === 'tail') flowMs = s.startMs + s.actualMs - 500;
        else flowMs = s.startMs + atSec * 1000;   // 显式秒数：段起点 + N 秒
        jobs.push({ label: String(s.id), source: src, t: filmTimeSec(tl, flowMs) });
    }
} else {
    const files = fs.readdirSync(src).filter((f) => /\.(mp4|mov|mkv|webm)$/i.test(f))
        .filter((f) => !PREFIX || f.startsWith(PREFIX)).sort();
    if (!files.length) { console.error(`目录里没有视频文件（前缀「${PREFIX}」下无匹配）：${src}`); process.exit(2); }
    const atArg = opt('at', '2.0');
    if (!Number.isFinite(Number(atArg))) { console.error(`--at 需要一个秒数，实际收到「${atArg}」`); process.exit(2); }
    for (const f of files) jobs.push({ label: path.basename(f, path.extname(f)), source: path.join(src, f), t: Number(atArg) });
}
if (!jobs.length) { console.error('待抽帧清单为空：timeline 里没有可取帧的段？'); process.exit(2); }

// ── 抽帧：统一宽度/高度/SAR 后再拼，混分辨率直接 hstack 会失败 ──────
const ref = probeH(jobs[0].source);
// 取偶数高：png/编码器要求偶数尺寸，且 hstack 要求各输入高度完全一致
const CELL_H = Math.max(2, Math.round(CELL_W * ref.height / ref.width / 2) * 2);
console.log(`抽帧 ${jobs.length} 张，格子 ${CELL_W}x${CELL_H}，每表 ${COLS}x${ROWS}`);

const failed = [], cells = [];
for (const j of jobs) {
    const out = path.join(dstDir, `frame-${j.label}.png`);
    let t = j.t;
    if (isFilm && t < 0) { failed.push(`${j.label} 取帧时刻为负（${t.toFixed(2)}s），时间轴有问题`); continue; }
    if (t < 0) t = 0;
    try {
        ff(['-ss', t.toFixed(3), '-i', j.source, '-frames:v', '1',
            '-vf', `scale=${CELL_W}:${CELL_H}:force_original_aspect_ratio=decrease,pad=${CELL_W}:${CELL_H}:(ow-iw)/2:(oh-ih)/2,setsar=1`, out]);
        cells.push(out);
    } catch (e) {
        failed.push(`${j.label} 抽帧失败：${(e.stderr || e.message || '').toString().slice(0, 160)}`);
    }
}
if (failed.length) failed.forEach((x) => console.log('  ✗ ' + x));

// ── 拼网格：每行 hstack、行间 vstack；单用 concat 只会得到一条竖直长条 ──
function buildSheet(files, dst) {
    const inputs = files.flatMap((f) => ['-i', f]);
    const parts = files.map((_, i) => `[${i}:v]format=rgb24[c${i}]`);
    // 只补「尾行」缺口：补到整行才能 hstack；按整表容量补齐会留下未连接的 pad 标签而报 filtergraph 错
    const nPad = (COLS - (files.length % COLS)) % COLS;
    for (let k = 0; k < nPad; k++) parts.push(`color=c=0x22262c:s=${CELL_W}x${CELL_H}:d=1,format=rgb24[pad${k}]`);
    const tag = (i) => (i < files.length ? `[c${i}]` : `[pad${i - files.length}]`);
    // hstack / vstack 的 inputs 下限都是 2，单格行与单行表必须跳过对应拼接，否则报「Value 1 out of range [2 - ...]」
    const rowLabels = [];
    for (let r = 0; r * COLS < files.length; r++) {
        const cs = Array.from({ length: COLS }, (_, k) => tag(r * COLS + k));
        if (COLS === 1) { rowLabels.push(cs[0]); continue; }
        const dst = `[r${rowLabels.length}]`;
        parts.push(`${cs.join('')}hstack=inputs=${COLS}${dst}`);
        rowLabels.push(dst);
    }
    const last = rowLabels[rowLabels.length - 1];
    const fc = parts.join(';') + (rowLabels.length > 1 ? `;${rowLabels.join('')}vstack=inputs=${rowLabels.length}[v]` : '');
    const mapLabel = rowLabels.length > 1 ? '[v]' : last;
    // -frames:v 1：color 源默认无限帧，不限制会让 image2 报「Cannot write more than one file with the same name」
    ff([...inputs, '-filter_complex', fc, '-map', mapLabel, '-frames:v', '1', dst]);
}

const nSheets = Math.ceil(cells.length / (COLS * ROWS)) || 1;
for (let s = 0; s < nSheets; s++) {
    const slice = cells.slice(s * COLS * ROWS, (s + 1) * COLS * ROWS);
    if (!slice.length) continue;
    const dst = path.join(dstDir, `sheet-${s + 1}.png`);
    buildSheet(slice, dst);
    console.log(`表 ${s + 1}/${nSheets}（${slice.length} 格，行优先）-> ${path.basename(dst)}`);
}
console.log(`输出目录 ${dstDir}；目视必查五项：字幕胶囊文字 / 当前登录身份 / 旁白提到的控件是否在画面里 / 下拉是否展开 / 所点导航项是否在可视区内`);
if (failed.length) process.exitCode = 1;
