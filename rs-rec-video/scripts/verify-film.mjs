#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 教程视频成片体检（通用，仅依赖 node + ffmpeg/ffprobe）
// ---------------------------------------------------------------------------
// 用法：
//   node verify-film.mjs <成片.mp4>                        # 全片级：流规格 + >1.2s 空洞清单
//   node verify-film.mjs <成片.mp4> <timeline.json>        # 逐段门槛（只对与 timeline 同源的画面轴有效，如未插卡 master）
//   node verify-film.mjs <成片.mp4> --cards 4              # 含静音引导卡的最终成片：卡片内静音属预期
//   node verify-film.mjs <成片.mp4> <master.json> --cards 4 --cards-at <film.json>  # 位置感知豁免（推荐）
// 卡片静音豁免两种方式（详见文件下方分类逻辑）：
//   ① 精确：--cards-at 给一份**成片时钟**时间轴（带 cards 数组，卡片起止坐标），静音段与某卡区间重叠才归该卡；
//   ② 粗筛（兼容旧 timeline）：无 cards 坐标时退回按「卡长+2×门槛」长度豁免，并显式告警——会连片头/片尾/段间一起吞掉。
// timeline + --cards 同时给时，只算覆盖率、跳过逐段取样：timeline 的 startMs 是**流程时钟**，
// 插卡后画面轴不再与之对齐，强行换算会把取样窗口落在卡片上，
// 报出一堆「开头静默 8.5s」的假故障（实测）。逐段门槛请对未插卡的 master 跑。
// timeline 字段取值契约与别名表见同目录 timeline.mjs（解析不出数值会直接报错，不会静默按 0 跑）。
// 退出码：0 全部达标；1 存在不达标项；2 参数或时间轴不可用。
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadTimeline, describeTimeline, filmTimeSec } from './timeline.mjs';

const args = process.argv.slice(2);
const film = args[0];
if (!film || !fs.existsSync(film)) { console.error('用法：node verify-film.mjs <成片.mp4> [timeline.json] [--cards N] [--cards-at film.json]'); process.exit(2); }
// 覆盖率/逐段用流程时钟时间轴（首个 .json），卡片坐标用成片时钟时间轴（--cards-at），两者不同源
const tlPath = args.find((a) => a.endsWith('.json'));
const cardsAtIdx = args.indexOf('--cards-at');
const cardsAtPath = cardsAtIdx > -1 ? args[cardsAtIdx + 1] : null;
const cardIdx = args.indexOf('--cards');
const cardSec = cardIdx > -1 ? Number(args[cardIdx + 1]) : 0;

const LEAD = 0.15;          // 切片/取样时为语音预留的前置量（秒）
const SILENCE_GATE = 1.2;   // 段尾留白门槛（秒）
const NOISE_DB = -60;       // 低于此最大电平视为无声轨/静音

const probe = (f) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json',
    '-show_format', '-show_streams', f], { encoding: 'utf8', maxBuffer: 1 << 24 }));
// volumedetect / silencedetect 的统计只写在 stderr，必须用 spawnSync 取 stderr
// 注意：-af 是**输出**选项，拼在 -i 之前会被 ffmpeg 当输入选项忽略掉（表现为统计为空、解析成 NA）。
// inputExtra 放 -i 之前（快速定位），filters 放 -i 之后。
const run = (inputExtra, filters, f) => {
    const r = spawnSync('ffmpeg', ['-hide_banner', ...inputExtra, '-i', f,
        ...(filters ? ['-af', filters] : []), '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 24 });
    return (r.stderr || '') + (r.stdout || '');
};
const level = (t) => {
    const m = /max_volume: (-?[\d.]+|-?inf(?:inity)?)/.exec(t), a = /mean_volume: (-?[\d.]+)/.exec(t);
    return { max: m ? m[1] : 'NA', mean: a ? a[1] : 'NA' };
};
const silences = (t) => {
    const starts = [...t.matchAll(/silence_start: ([-\d.]+)/g)].map((m) => Number(m[1]));
    const ends = [...t.matchAll(/silence_end: ([-\d.]+)/g)].map((m) => Number(m[1]));
    return starts.map((s, i) => ({ start: s, end: ends[i] ?? null }));
};

const p = probe(film);
const v = p.streams.find((s) => s.codec_type === 'video') || {};
const a = p.streams.find((s) => s.codec_type === 'audio');
const dur = Number(p.format.duration);
console.log(`成片 ${path.basename(film)}  ${(dur / 60).toFixed(1)} 分钟  ${(p.format.size / 1048576).toFixed(1)} MB`);
console.log(`  视频 ${v.codec_name} ${v.width}x${v.height} ${v.pix_fmt} ${v.r_frame_rate}`);
console.log(`  音频 ${a ? `${a.codec_name} ${a.sample_rate}Hz ${a.channels}ch` : '缺失'}`);

const issues = [];
// timeline 提前解析：逐段核对与覆盖率都只依赖它
let tl = null;
if (tlPath) {
    try { tl = loadTimeline(tlPath); }
    catch (e) { console.error(`时间轴不可用：${e.message}`); process.exit(2); }
}
// 卡片坐标来自**成片时钟**时间轴（--cards-at），与覆盖率用的流程时间轴不同源，各读一份
let filmTl = null;
if (cardsAtPath) {
    try { filmTl = loadTimeline(cardsAtPath); }
    catch (e) { console.error(`卡片坐标时间轴不可用：${e.message}`); process.exit(2); }
}
if (!a) issues.push('无音频流');
const all = run([], `silencedetect=n=-45dB:d=${SILENCE_GATE}`, film);
const holes = silences(all).filter((s) => s.end === null || s.end - s.start > SILENCE_GATE);
// ── 静音归类 ──────────────────────────────────────────────
// 片头（总览卡 + 录制器对齐静默）与片尾自然收尾只报不判；卡片静音按坐标精确豁免；
// 卡片外的段间静音走「段间容差」（本地 TTS 尾音衰减会把真实空隙撑大 ~0.4~0.6s），超容差才判空洞。
const BLEED_TOL = SILENCE_GATE + 0.3;      // 位置感知：卡片前后允许的尾音/前置外溢（秒）
const GAP_TOL = SILENCE_GATE + 0.6;        // 卡片外段间静音容差：实测尾音衰减撑大的那部分不计为缺陷
const CARD_ALLOW = cardSec + 2 * SILENCE_GATE;   // 粗筛模式（无卡片坐标）的长度上限
const cardList = cardSec > 0 && filmTl && filmTl.cards ? filmTl.cards : null;
let cardHoles = [];   // { h, card }；粗筛模式下 card 为 null
let rest;
if (cardList) {
    // 精确豁免：静音段须与某张卡片的成片区间重叠（至少盖住半张卡），且不外溢到卡片两侧留白容差之外
    const minHit = Math.min(1.0, cardSec * 0.5);
    const hit = (h) => {
        const he = h.end ?? dur;
        return cardList.find((c) => {
            const cs = c.startMs / 1000, ce = c.endMs / 1000;
            const ov = Math.min(he, ce) - Math.max(h.start, cs);
            return ov >= minHit && h.start >= cs - BLEED_TOL && he <= ce + BLEED_TOL;
        });
    };
    rest = [];
    holes.forEach((h) => { const c = hit(h); if (c) cardHoles.push({ h, card: c }); else rest.push(h); });
} else if (cardSec > 0) {
    // 兼容旧口径：无坐标时退回按长度粗筛——它会把片头/片尾/段间 ≤CARD_ALLOW 的静音一起吞掉
    cardHoles = holes.filter((h) => (h.end ?? dur) - h.start <= CARD_ALLOW).map((h) => ({ h, card: null }));
    rest = holes.filter((h) => !cardHoles.some((x) => x.h === h));
} else {
    rest = holes.slice();
}
const headHoles = rest.filter((h) => h.start < 0.15);
const tailHoles = rest.filter((h) => !headHoles.includes(h) && (h.end === null || h.end >= dur - 0.35));
const nonEdge = rest.filter((h) => !headHoles.includes(h) && !tailHoles.includes(h));
const gapHoles = nonEdge.filter((h) => (h.end ?? dur) - h.start <= GAP_TOL);
const badHoles = nonEdge.filter((h) => (h.end ?? dur) - h.start > GAP_TOL);
console.log(`  >${SILENCE_GATE}s 静音段 ${holes.length} 处` + (cardSec ? `（其中 ${cardHoles.length} 处${cardList ? '按坐标命中引导卡' : `按长度 ≤ ${CARD_ALLOW.toFixed(1)}s 粗筛为卡片候选`}）` : ''));
headHoles.forEach((h) => console.log(`  · 片头静音 ${h.start.toFixed(2)}s → ${(h.end ?? dur).toFixed(2)}s（总览卡与头部对齐静默）`));
tailHoles.forEach((h) => console.log(`  · 片尾收尾静音 ${h.start.toFixed(2)}s → 片尾（豁免，但需列入交付说明）`));
if (cardList) cardHoles.forEach(({ h, card }) => console.log(`  · 卡片静音 ${h.start.toFixed(2)}s → ${(h.end ?? dur).toFixed(2)}s，命中「${card.id}」卡 [${(card.startMs / 1000).toFixed(2)}, ${(card.endMs / 1000).toFixed(2)}]s`));
gapHoles.forEach((h) => console.log(`  · 段间静音 ${h.start.toFixed(2)}s → ${(h.end ?? dur).toFixed(2)}s（卡片外 ${((h.end ?? dur) - h.start).toFixed(2)}s ≤ ${GAP_TOL.toFixed(1)}s 尾音容差，真·段间门槛见未插卡 master 逐段核对）`));
if (cardSec && !cardList) console.log('  ⚠ 卡片豁免走长度粗筛（未给 --cards-at 坐标）：会连片头/片尾/段间一起吞，建议传成片时钟时间轴做位置感知豁免');
badHoles.slice(0, 12).forEach((h) => issues.push(`静音空洞 ${h.start.toFixed(2)}s → ${h.end === null ? '片尾' : h.end.toFixed(2) + 's'}（卡片外且超段间容差 ${GAP_TOL.toFixed(1)}s）`));
if (badHoles.length > 12) issues.push(`…另有 ${badHoles.length - 12} 处空洞`);

// ES Module 顶层不允许 return，逐段核对整块放在 if 里
if (tl) {
    const segs = tl.segments;
    console.log(describeTimeline(tl));
    // 逐段取样只对与 timeline 同源的画面轴有效；插卡成片只算覆盖率（覆盖率与位置无关）
    if (cardSec === 0) {
        console.log(`\n逐段核对（${segs.length} 段）`);
        console.log('id            窗口s   语音s  开头静默s  段尾留白s  下段间隔s  mean/max dB');
        for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            // 画面时间轴 = 流程时钟 + 音频偏移 − 头部裁剪（换算收在 timeline.mjs，漏一项会整段测到上一段语音）
            const winStart = filmTimeSec(tl, s.startMs) - LEAD;
            // 窗口 = 该段画面跨度（前置量 LEAD + actualMs）；注意单位，把秒值 LEAD 直接加到 ms 上会让窗口短掉 0.15s
            const winDur = Math.max(0.5, LEAD + s.actualMs / 1000);
            // 必须同时带 volumedetect 与 silencedetect：不接滤镜时 ffmpeg 不输出任何统计，
            // 电平与静音全解析成 NA，逐段门槛会「全部通过」但形同虚设。
            const txt = run(['-ss', winStart.toFixed(3), '-t', winDur.toFixed(3)],
                'volumedetect,silencedetect=n=-45dB:d=0.35', film);
            const lv = level(txt);
            const sil = silences(txt);
            // 开头静默：只有静音从 0 附近开始才算「语音没贴到段首」，句中换气不计
            const lead = sil.length && sil[0].start < 0.5 ? (sil[0].end ?? sil[0].start) : 0;
            const tail = winDur - LEAD - s.durMs / 1000;
            const nextGap = i + 1 < segs.length ? (segs[i + 1].startMs - (s.startMs + s.durMs)) / 1000 : tail;
            const id = String(s.id);
            if (winStart + winDur > dur + 0.05) issues.push(`${id} 窗口超出片尾（${(winStart + winDur).toFixed(2)}s > ${dur.toFixed(2)}s），尾部语音可能被截断`);
            if (lead > 0.8) issues.push(`${id} 开头静默 ${lead.toFixed(2)}s（>0.8s，语音没贴到段首或语音归属错）`);
            if (tail < -0.06) issues.push(`${id} 画面短于语音（尾部被切 ${(tail * -1).toFixed(2)}s）`);
            if (tail > SILENCE_GATE + 0.1) issues.push(`${id} 段尾留白 ${tail.toFixed(2)}s 超门槛`);
            if (nextGap > SILENCE_GATE + 0.1) issues.push(`${id} 与下一段间隔 ${nextGap.toFixed(2)}s 超门槛`);
            if (!(Number(lv.max) > NOISE_DB)) issues.push(`${id} 音轨疑似无声（max ${lv.max}dB）`);
            console.log(`${id.padEnd(12)}${winDur.toFixed(2).padStart(8)}${(s.durMs / 1000).toFixed(1).padStart(8)}${lead.toFixed(2).padStart(12)}${tail.toFixed(2).padStart(12)}${nextGap.toFixed(2).padStart(12)}  ${lv.mean.padStart(7)}/${lv.max.padStart(7)}`);
        }
    } else {
        console.log('\n逐段取样已跳过：画面轴含引导卡，与 timeline 的流程时钟不同源（只对未插卡 master 有效）');
    }
    const speech = segs.reduce((n, s) => n + s.durMs, 0);
    const last = segs[segs.length - 1];
    const flowMs = last ? last.startMs + last.actualMs : 0;
    if (flowMs > 0) {
        const cov = speech / flowMs;
        console.log(`\n语音覆盖率 ${(cov * 100).toFixed(1)}%（语音 ${speech / 1000}s ÷ 流程 ${flowMs / 1000}s，分母不含卡片）`);
        if (cov < 0.95) issues.push(`语音覆盖率 ${(cov * 100).toFixed(1)}% < 95%`);
    }
}
report();

function report() {
    console.log(`\n问题 ${issues.length} 项：${issues.length ? '' : '无'}`);
    issues.forEach((x) => console.log('  ✗ ' + x));
    if (issues.length) process.exitCode = 1;
}
