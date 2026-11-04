#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 录制器时间轴（timeline JSON）字段解析层
// ---------------------------------------------------------------------------
// 为什么单独一个文件：抽帧与体检两个脚本都要读同一份 timeline，而各录制器落盘的
// 字段名并不统一（startMs / start_ms / start，durMs / audioMs，padMs / audioPadMs…）。
// 早先两脚本各写一串 `x ?? y ?? 0` 的兜底，字段名一变就**静默退化成 0**：
// 取帧时刻整体偏移、段尾留白算错、覆盖率虚高，而退出码照常是 0，属于最危险的一类缺陷。
// 这里把取值口径收敛成唯一一份契约，并且：
//   ① 必填字段解析不到 → 直接抛错并打印文件里**实际存在的键名**，不猜；
//   ② 可选字段回落 → 记入 degraded 清单，由调用方在输出里显式提示；
//   ③ 字段名换写法 → 只改本文件的 ALIASES，判定阈值一律不动（阈值属验收规范）。
// 契约（归一后）：{ segments: [{ id, startMs, durMs, actualMs }], offsetMs, trimMs, padMs }
//   startMs   该段在**流程时钟**上的起点（ms）
//   durMs     该段旁白语音时长（ms）——覆盖率分子、段尾留白的减数
//   actualMs  该段画面实拍时长（ms）——缺省时回落 durMs 并记 degraded
//   padMs     录制器为对齐音视频在头部补的静默（ms）
//   trimMs    成片头部裁掉的量（ms）
//   offsetMs  画面轴相对流程时钟的音频偏移（ms）；显式给出优先，否则按 padMs / 2 推
// 可选顶层字段 cards：引导卡在**成片时钟**上的区间数组 [{ id, startMs, endMs }]，
//   供体检脚本做「位置感知」的卡片静音豁免（缺省则为 null，体检退回按长度粗筛并告警）。
//   卡片坐标必须是成片时钟（插卡后的画面轴），与 segments 的流程时钟不同源，故单独成数组。
//   注意：给 cards 的那份 timeline 通常就是成片时钟时间轴（offsetMs=0），与用于逐段门槛的
//   流程时间轴（master）不是同一个文件——体检脚本会分别读取、各司其职。
import fs from 'node:fs';

const ALIASES = {
    segments: ['segments', 'clips', 'parts', 'entries', 'items', 'timeline'],
    id: ['id', 'segId', 'seg_id', 'name', 'label', 'key'],
    startMs: ['startMs', 'start_ms', 'start', 'beginMs', 'begin_ms', 't0'],
    durMs: ['durMs', 'dur_ms', 'audioMs', 'audio_ms', 'speechMs', 'narrationMs', 'durationMs'],
    actualMs: ['actualMs', 'actual_ms', 'videoMs', 'video_ms', 'screenMs', 'clipMs', 'frameMs'],
    padMs: ['padMs', 'pad_ms', 'headPadMs', 'audioPadMs'],
    trimMs: ['trimMs', 'trim_ms', 'headTrimMs', 'cropMs', 'leadTrimMs'],
    offsetMs: ['offsetMs', 'offset_ms', 'audioOffsetMs', 'avOffsetMs', 'syncOffsetMs'],
    cards: ['cards', 'guideCards', 'cardMs', 'cardList', 'cardIntervals'],
    endMs: ['endMs', 'end_ms', 'end', 'finishMs', 'stopMs'],
};

export class TimelineError extends Error {}

// 只接受「有限非负数」，字符串数字先转换：录制器偶尔把毫秒写成字符串，
// 但 null / undefined / NaN / 负数必须算解析失败，不能当 0 混过去
const ms = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

function pick(obj, key, where, errors) {
    for (const name of ALIASES[key]) {
        if (Object.prototype.hasOwnProperty.call(obj, name)) {
            const v = obj[name];
            if (key === 'segments' || key === 'cards') {
                if (Array.isArray(v) && v.length) return { value: v, from: name };
                errors.push(`${where}.${key} 命中字段「${name}」但不是非空数组`);
                return null;
            }
            const n = ms(v);
            if (n !== null) return { value: n, from: name };
            errors.push(`${where}.${key} 命中字段「${name}」但值不是非负数：${JSON.stringify(v)}`);
            return null;
        }
    }
    return null;
}

const keysOf = (o) => Object.keys(o || {}).join(',') || '(空对象)';

/** 读取并归一 timeline 文件；解析失败抛 TimelineError（消息带实际键名，便于改 ALIASES） */
export function loadTimeline(file) {
    let raw;
    try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { throw new TimelineError(`读取/解析 timeline 失败：${file} —— ${e.message}`); }
    // 允许顶层直接是段数组（部分录制器只段落数组）
    const root = Array.isArray(raw) ? { segments: raw } : raw;
    if (!root || typeof root !== 'object') throw new TimelineError(`timeline 顶层既不是对象也不是段数组：${file}`);

    const errors = [];
    const segList = pick(root, 'segments', '顶层', errors);
    // 兼容「段数组挂在别的名字下」：取顶层第一个对象数组字段当段列表，并在映射里如实标出来
    const segFrom = segList ? segList.from
        : (() => {
            const arrKey = Object.keys(root).find((k) => Array.isArray(root[k]) && root[k].length && root[k][0] && typeof root[k][0] === 'object');
            return arrKey ?? null;
        })();
    if (segFrom === null) throw new TimelineError(`timeline 里找不到段数组（尝试过 ${ALIASES.segments.join('/')}），实际顶层键：${keysOf(root)}`);
    const segs = segList ? segList.value : root[segFrom];

    const degraded = [];
    const resolved = { segments: segFrom };   // 字段名 → 实际命中的键（只记首次，避免逐段重复刷屏）
    const segments = segs.map((s, i) => {
        if (!s || typeof s !== 'object') throw new TimelineError(`第 ${i + 1} 个段不是对象：${JSON.stringify(s)}`);
        const at = `段[${i}]`;
        const g = (key, required) => {
            const hit = pick(s, key, at, errors);
            if (!hit) {
                if (required) throw new TimelineError(`${at} 缺必填字段 ${key}（尝试过 ${ALIASES[key].join('/')}），该段实际键：${keysOf(s)}`);
                return null;
            }
            if (!resolved[key]) resolved[key] = hit.from;
            return hit.value;
        };
        const startMs = g('startMs', true);
        const durMs = g('durMs', true);
        let actualMs = g('actualMs', false);
        if (actualMs === null) { actualMs = durMs; degraded.push(`${String(s.id ?? s.name ?? i)} 缺画面时长字段（actualMs 类），按语音时长 ${durMs}ms 估`); }
        return { id: s.id ?? s.name ?? s.label ?? String(i), index: i, startMs, durMs, actualMs };
    });

    const gRoot = (key) => {
        const hit = pick(root, key, '顶层', errors);
        if (!hit) return null;
        resolved[key] = hit.from;
        return hit.value;
    };
    const padMs = gRoot('padMs');
    const trimMs = gRoot('trimMs') ?? 0;
    const offsetMs = gRoot('offsetMs');
    // 音频偏移缺失是高危：漏掉它会整段测到上一段的语音，却看不出错
    const finalOffset = offsetMs ?? (padMs !== null ? padMs / 2 : 0);
    if (offsetMs === null) {
        degraded.push(padMs !== null
            ? `无显式音频偏移字段，按 padMs/2 = ${finalOffset}ms 推算（录制器口径若不同需核对）`
            : 'timeline 既无 offsetMs 也无 padMs，音频偏移按 0 处理——抽帧/取样时刻可能整体偏移');
    }
    // 可选卡片坐标：缺失不报错（多数流程时间轴本就没有卡），存在则逐项校验起止
    const cardsHit = pick(root, 'cards', '顶层', errors);
    let cards = null;
    if (cardsHit) {
        cards = cardsHit.value.map((c, i) => {
            if (!c || typeof c !== 'object') throw new TimelineError(`第 ${i + 1} 个卡片不是对象：${JSON.stringify(c)}`);
            const st = pick(c, 'startMs', `卡片[${i}]`, errors);
            const en = pick(c, 'endMs', `卡片[${i}]`, errors);
            if (!st || !en) throw new TimelineError(`卡片[${i}] 缺 startMs 或 endMs（成片时钟 ms），该卡实际键：${keysOf(c)}`);
            if (en.value < st.value) throw new TimelineError(`卡片[${i}] endMs(${en.value}) < startMs(${st.value})，区间倒挂`);
            return { id: String(c.id ?? c.name ?? i), startMs: st.value, endMs: en.value };
        });
        resolved.cards = cardsHit.from;
    }
    if (errors.length) degraded.push(...errors);
    return { file, segments, cards, padMs, trimMs, offsetMs: finalOffset, resolved, degraded };
}

/** 流程时钟 ms → 成片画面秒（含音频偏移与头部裁剪，缺一项都会整体偏移） */
export function filmTimeSec(tl, flowMs) {
    return (flowMs + tl.offsetMs - tl.trimMs) / 1000;
}

/** 打印字段映射与降级项，让「值从哪来」「哪些是估的」在输出里可见 */
export function describeTimeline(tl) {
    const map = Object.entries(tl.resolved).map(([k, v]) => `${k}←${v}`).join(' ');
    return `时间轴字段映射 ${map}｜音频偏移 ${tl.offsetMs}ms｜头部裁剪 ${tl.trimMs}ms`
        + (tl.cards ? `｜卡片坐标 ${tl.cards.length} 张（成片时钟）` : '')
        + (tl.degraded.length ? `\n  ⚠ 取值降级 ${tl.degraded.length} 项：${tl.degraded.slice(0, 4).join('；')}${tl.degraded.length > 4 ? ` …另 ${tl.degraded.length - 4} 项` : ''}` : '');
}
