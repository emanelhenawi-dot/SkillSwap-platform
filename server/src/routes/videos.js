import { Router } from 'express';
import mongoose from 'mongoose';
import Video from '../models/Video.js';
import WatchSession from '../models/WatchSession.js';
import Transaction from '../models/Transaction.js';
import Setting, { DEFAULT_ECONOMY } from '../models/Setting.js';
import { protect, allow } from '../middleware/auth.js';
import { fail, wrap } from '../utils/helpers.js';
import { debit, credit } from '../utils/ledger.js';
import { aiGenerateQuiz } from '../utils/ai.js';
import { notifyParents } from '../utils/family.js';

const router = Router();
router.use(protect, allow('user'));

const same = (a, b) => String(a) === String(b);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- helpers ----------
function parseMedia(raw) {
  let u;
  try { u = new URL(String(raw).trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\./, '');
  if (['youtu.be', 'youtube.com', 'm.youtube.com'].includes(host)) {
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (u.pathname === '/watch') id = u.searchParams.get('v');
    else id = (u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/) || [])[1] || null;
    return /^[\w-]{11}$/.test(id || '') ? { provider: 'youtube', youtubeId: id } : null;
  }
  return /\.(mp4|webm)$/i.test(u.pathname) ? { provider: 'file', url: u.href } : null;
}

function splitTranscript(text, n) {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?؟۔]+[.!?؟۔]?/g) || [text];
  const target = sentences.join(' ').length / n;
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    cur += s.trim() + ' ';
    if (cur.length >= target && chunks.length < n - 1) { chunks.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

// سؤال لكل جزء، ووقته عشوائي بعد ما الجزء يخلص (مش في الأول ولا في آخر 15 ثانية)
async function buildCheckpoints(video) {
  const D = video.durationSec;
  const n = Math.min(8, Math.max(2, Math.round(D / 240)), Math.floor(video.transcript.length / 250));
  if (n < 2) throw new Error('Transcript too short for quiz generation');
  const chunks = splitTranscript(video.transcript, n);
  const N = chunks.length;
  const { questions } = await aiGenerateQuiz({
    title: video.title, language: video.language,
    chunks: chunks.map((text, index) => ({ index, text: text.slice(0, 6000) })),
  });
  return (questions || [])
    .filter((q) => Number.isInteger(q.chunk) && q.chunk >= 0 && q.chunk < N && Array.isArray(q.options) && q.options.length === 4 && q.correct_index >= 0 && q.correct_index < 4)
    .map((q) => {
      const start = (D * q.chunk) / N;
      const len = D / N;
      return {
        at: Math.round(clamp(rand(start + len * 0.55, start + len * 0.9), 20, D - 15)),
        from: Math.round(start),
        question: q.question, options: q.options, correctIndex: q.correct_index, explanation: q.explanation || '',
      };
    })
    .sort((a, b) => a.at - b.at);
}

async function runGeneration(videoId) {
  const video = await Video.findById(videoId).select('+transcript');
  if (!video) return 0;
  try {
    video.checkpoints = await buildCheckpoints(video);
    video.aiNotes = video.checkpoints.length >= 2
      ? `AI generated ${video.checkpoints.length} questions`
      : 'AI could not generate enough questions — regenerate or edit the transcript';
  } catch (e) {
    console.error('Quiz generation failed:', e.message);
    video.aiNotes = 'Quiz generation failed: ' + String(e.message).slice(0, 120);
  }
  await video.save();
  return video.checkpoints.length;
}

const pubCp = (c) => ({ id: c._id, at: c.at, from: c.from, question: c.question, options: c.options });

// أقرب سؤال لسه ما اتجاوبش صح = "البوابة" اللي ممنوع يعدّيها
const gateOf = (video, session) => {
  const done = new Set((session?.answers || []).filter((a) => a.correct).map((a) => String(a.cp)));
  return [...video.checkpoints].sort((a, b) => a.at - b.at).find((c) => !done.has(String(c._id))) || null;
};

function viewOf(video, session, isOwner) {
  const unlocked = isOwner || !!session?.charged;
  const eco = viewOf.eco || DEFAULT_ECONOMY;
  return {
    isOwner,
    video: {
      id: video._id, title: video.title, description: video.description, durationSec: video.durationSec,
      creatorName: video.creator?.name, cost: eco.videoCost,
      ...(unlocked ? { provider: video.provider, youtubeId: video.youtubeId, url: video.url } : {}),
    },
    checkpoints: unlocked ? [...video.checkpoints].sort((a, b) => a.at - b.at).map(pubCp) : [],
    session: session
      ? { charged: session.charged, maxPosition: session.maxPosition, completed: !!session.completedAt,
          answered: session.answers.filter((a) => a.correct).map((a) => String(a.cp)) }
      : null,
  };
}

const getEconomy = async () => (await Setting.findOne({ key: 'economy' }))?.value ?? DEFAULT_ECONOMY;

async function loadVideo(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { fail(res, 404, 'NOT_FOUND'); return null; }
  const video = await Video.findById(req.params.id).populate('creator', 'name');
  const isOwner = video && same(video.creator?._id, req.user._id);
  if (!video || (video.status !== 'accepted' && !isOwner)) { fail(res, 404, 'NOT_FOUND'); return null; }
  return { video, isOwner };
}

// ---------- list / create ----------
router.get('/', wrap(async (req, res) => {
  if (req.query.mine) {
    const vs = await Video.find({ creator: req.user._id }).sort('-createdAt').select('title status aiNotes durationSec checkpoints.at').lean();
    return res.json({ videos: vs.map((v) => ({ id: v._id, title: v.title, status: v.status, aiNotes: v.aiNotes, durationSec: v.durationSec, questions: v.checkpoints.length })) });
  }
  const vs = await Video.find({ status: 'accepted' }).populate('creator', 'name').sort('-createdAt').limit(60).select('title description durationSec creator').lean();
  const eco = await getEconomy();
  res.json({ cost: eco.videoCost, videos: vs.map((v) => ({ id: v._id, title: v.title, description: (v.description || '').slice(0, 160), durationSec: v.durationSec, creatorName: v.creator?.name })) });
}));

router.post('/', wrap(async (req, res) => {
  const { title, description, videoUrl, durationMin, transcript, language } = req.body || {};
  const media = parseMedia(videoUrl);
  const durationSec = Math.round(Number(durationMin) * 60);
  const text = String(transcript || '').trim();
  if (!media) return fail(res, 400, 'INVALID_VIDEO_URL');
  if (String(title || '').trim().length < 3 || !(durationSec >= 3600 && durationSec <= 4 * 3600) || text.length < 500 || text.length > 50000) {
    return fail(res, 400, 'INVALID_INPUT');
  }
  const video = await Video.create({
    title: String(title).trim().slice(0, 120), description: String(description || '').slice(0, 1000),
    creator: req.user._id, durationSec, transcript: text, language: language === 'en' ? 'en' : 'ar', ...media,
  });
  runGeneration(video._id).catch((e) => console.error(e)); // في الخلفية
  res.status(201).json({ id: video._id });
}));

router.post('/:id/checkpoints/generate', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'NOT_FOUND');
  const v = await Video.findOne({ _id: req.params.id, creator: req.user._id });
  if (!v) return fail(res, 404, 'NOT_FOUND');
  if (v.status === 'accepted') return fail(res, 409, 'ALREADY_DECIDED'); // بعد القبول ما نغيّرش الأسئلة
  res.json({ questions: await runGeneration(v._id) });
}));

// ---------- watching ----------
router.get('/:id', wrap(async (req, res) => {
  const f = await loadVideo(req, res);
  if (!f) return;
  const session = await WatchSession.findOne({ user: req.user._id, video: f.video._id });
  viewOf.eco = await getEconomy();
  res.json(viewOf(f.video, session, f.isOwner));
}));

router.post('/:id/start', wrap(async (req, res) => {
  const f = await loadVideo(req, res);
  if (!f) return;
  const { video, isOwner } = f;
  let session = await WatchSession.findOne({ user: req.user._id, video: video._id });
  if (!session) {
    try { session = await WatchSession.create({ user: req.user._id, video: video._id }); }
    catch (e) { if (e?.code === 11000) session = await WatchSession.findOne({ user: req.user._id, video: video._id }); else throw e; }
  }
  const eco = await getEconomy();
  if (!session.charged && !isOwner) {
    if (eco.videoCost > 0) {
      const paid = await debit(req.user._id, eco.videoCost, 'spend', `Watch: ${video.title}`);
      if (!paid) return fail(res, 402, 'INSUFFICIENT_CREDITS');
      const claimed = await WatchSession.findOneAndUpdate({ _id: session._id, charged: false }, { charged: true }, { new: true });
      if (!claimed) {
        await credit(req.user._id, eco.videoCost, 'refund', 'Duplicate charge'); // طلبين في نفس اللحظة
      } else {
        session = claimed;
        await credit(video.creator._id, eco.creatorShare, 'creator_earn', `Views: ${video.title}`);
        if (eco.treasuryShare > 0) await Transaction.create({ user: null, type: 'treasury_in', amount: eco.treasuryShare, note: video.title });
      }
    } else {
      session.charged = true;
      await session.save();
    }
  }
  viewOf.eco = eco;
  res.json(viewOf(video, session, isOwner));
}));

// نبض المشاهدة كل ~5 ثواني: السيرفر هو اللي يقرر أبعد نقطة وصلها
router.post('/:id/heartbeat', wrap(async (req, res) => {
  const f = await loadVideo(req, res);
  if (!f) return;
  const session = await WatchSession.findOne({ user: req.user._id, video: f.video._id });
  if (!session || (!session.charged && !f.isOwner)) return fail(res, 403, 'FORBIDDEN');
  const now = Date.now();
  const dt = (now - (session.lastBeat || session.updatedAt || now)) / 1000;
  let pos = Number(req.body.position);
  if (!Number.isFinite(pos) || pos < 0) return fail(res, 400, 'INVALID_INPUT');
  pos = Math.min(pos, session.maxPosition + Math.min(dt, 30) * 2 + 3, f.video.durationSec); // مفيش قفز
  const gate = gateOf(f.video, session);
  if (gate) pos = Math.min(pos, gate.at + 1);
  session.maxPosition = Math.max(session.maxPosition, pos);
  session.lastBeat = new Date(now);
  await session.save();
  res.json({ maxPosition: session.maxPosition });
}));

router.post('/:id/checkpoints/:cid/answer', wrap(async (req, res) => {
  const f = await loadVideo(req, res);
  if (!f) return;
  const choice = Number(req.body.choice);
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return fail(res, 400, 'INVALID_INPUT');
  const session = await WatchSession.findOne({ user: req.user._id, video: f.video._id });
  const cp = f.video.checkpoints.id(req.params.cid);
  if (!session || !cp) return fail(res, 404, 'NOT_FOUND');
  if (session.maxPosition < cp.at - 8) return fail(res, 403, 'NOT_REACHED'); // ما وصلش للسؤال لسه

  let a = session.answers.find((x) => same(x.cp, cp._id));
  if (!a) { session.answers.push({ cp: cp._id, tries: 0, correct: false }); a = session.answers[session.answers.length - 1]; }
  if (a.correct) return res.json({ correct: true, explanation: cp.explanation });

  a.tries += 1;
  const ok = choice === cp.correctIndex;
  if (ok) a.correct = true;
  await session.save();
  // لو غلط: ما نكشفش الإجابة، ونرجّعه يعيد الجزء
  res.json(ok ? { correct: true, explanation: cp.explanation } : { correct: false, rewindTo: cp.from });
}));

router.post('/:id/complete', wrap(async (req, res) => {
  const f = await loadVideo(req, res);
  if (!f) return;
  const session = await WatchSession.findOne({ user: req.user._id, video: f.video._id });
  if (!session) return fail(res, 403, 'FORBIDDEN');
  const allDone = f.video.checkpoints.every((c) => session.answers.some((a) => same(a.cp, c._id) && a.correct));
  if (!allDone || session.maxPosition < f.video.durationSec * 0.9) return fail(res, 400, 'NOT_FINISHED');
  if (!session.completedAt) {
    session.completedAt = new Date();
    const total = f.video.checkpoints.length;
    session.score = total ? session.answers.filter((a) => a.correct && a.tries === 1).length / total : 1;
    await session.save();
    if (req.user.isMinor) await notifyParents(req.user, 'child_watched', { title: String(f.video.title).slice(0, 100) });
  }
  res.json({ completed: true, score: session.score });
}));

export default router;