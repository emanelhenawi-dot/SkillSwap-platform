import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Video from '../models/Video.js';
import WatchSession from '../models/WatchSession.js';
import { protect, allow } from '../middleware/auth.js';
import { fail, wrap } from '../utils/helpers.js';
import { aiChat } from '../utils/ai.js';

const router = Router();
router.use(protect, allow('user'));

const limiter = rateLimit({
  windowMs: 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id), message: { code: 'TOO_MANY_REQUESTS' },
});

router.post('/chat', limiter, wrap(async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 1000);
  if (!message) return fail(res, 400, 'INVALID_INPUT');

  let context = '';
  let sid = `${req.user._id}:general`;
  const { videoId } = req.body;
  if (videoId) {
    if (!mongoose.isValidObjectId(videoId)) return fail(res, 404, 'NOT_FOUND');
    const video = await Video.findById(videoId).select('+transcript title description creator status');
    if (!video) return fail(res, 404, 'NOT_FOUND');
    const owner = String(video.creator) === String(req.user._id);
    const paid = await WatchSession.exists({ user: req.user._id, video: video._id, charged: true });
    if (!owner && !paid) return fail(res, 403, 'FORBIDDEN'); // المعلّم مرتبط بالفيديوهات اللي الطالب فتحها
    context = `Title: ${video.title}\nDescription: ${video.description || ''}\nTranscript:\n${(video.transcript || '').slice(0, 6000)}`;
    sid = `${req.user._id}:${videoId}`;
  }
  try {
    const { reply } = await aiChat({ message, session_id: sid, context, is_minor: !!req.user.isMinor });
    res.json({ reply });
  } catch (e) {
    console.error('AI chat error:', e.message);
    fail(res, 502, 'AI_UNAVAILABLE');
  }
}));

export default router;