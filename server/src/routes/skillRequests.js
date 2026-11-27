import { Router } from 'express';

import mongoose from 'mongoose';

import SkillRequest from '../models/SkillRequest.js';

import Transaction from '../models/Transaction.js';

import { protect, allow } from '../middleware/auth.js';

import { fail, wrap } from '../utils/helpers.js';

import { debit, credit } from '../utils/ledger.js';

const router = Router();

router.use(protect, allow('user'));


// ================= CREATE REQUEST =================

router.post('/', wrap(async (req, res) => {

  const {
    title,
    description,
    subject,
    language,
    level,
    urgency
  } = req.body || {};

  const urgent = urgency === 'urgent';

  const bounty = urgent ? 5 : 3;

  if (
    String(title || '').trim().length < 3 ||
    String(description || '').trim().length < 10 ||
    !String(subject || '').trim()
  ) {
    return fail(res, 400, 'INVALID_INPUT');
  }

  const user = await debit(
    req.user._id,
    bounty,
    'spend',
    'Skill Request Bounty'
  );

  if (!user) {
    return fail(res, 400, 'INSUFFICIENT_CREDITS');
  }

  try {

    const request = await SkillRequest.create({

      student: req.user._id,

      title: String(title).trim(),

      description: String(description).trim(),

      subject: String(subject).trim(),

      language: language === 'en' ? 'en' : 'ar',

      level: [
        'beginner',
        'intermediate',
        'advanced'
      ].includes(level) ? level : 'beginner',

      urgency: urgent ? 'urgent' : 'regular',

      bounty

    });

    res.status(201).json({

      request,

      balance: user.points

    });

  } catch (error) {

    await credit(
      req.user._id,
      bounty,
      'refund',
      'Skill Request creation failed'
    );

    throw error;

  }

}));


// ================= LIST OPEN REQUESTS =================

router.get('/', wrap(async (req, res) => {

  const requests = await SkillRequest.find({

    status: {
      $in: ['open', 'claimed', 'submitted']
    }

  })

    .populate('student', 'name')

    .populate('creator', 'name')

    .sort({
      urgency: -1,
      createdAt: -1
    })

    .limit(50);

  res.json({ requests });

}));


// ================= MY REQUESTS =================

router.get('/mine', wrap(async (req, res) => {

  const requests = await SkillRequest.find({

    student: req.user._id

  })

    .populate('creator', 'name')

    .sort('-createdAt');

  res.json({ requests });

}));


// ================= CLAIM REQUEST =================

router.post('/:id/claim', wrap(async (req, res) => {

  if (!mongoose.isValidObjectId(req.params.id)) {

    return fail(res, 404, 'NOT_FOUND');

  }

  const request = await SkillRequest.findOneAndUpdate({

    _id: req.params.id,

    status: 'open',

    student: { $ne: req.user._id }

  }, {

    status: 'claimed',

    creator: req.user._id

  }, {

    new: true

  });

  if (!request) {

    return fail(res, 409, 'REQUEST_UNAVAILABLE');

  }

  res.json({ request });

}));


// ================= SUBMIT EXPLANATION =================

router.post('/:id/submit', wrap(async (req, res) => {

  const responseText = String(
    req.body.responseText || ''
  ).trim();

  const responseUrl = String(
    req.body.responseUrl || ''
  ).trim();

  if (
    responseText.length < 10 ||
    responseText.length > 1500
  ) {

    return fail(res, 400, 'INVALID_INPUT');

  }

  if (
    responseUrl &&
    !/^https:\/\//i.test(responseUrl)
  ) {

    return fail(res, 400, 'INVALID_INPUT');

  }

  const request = await SkillRequest.findOneAndUpdate({

    _id: req.params.id,

    creator: req.user._id,

    status: 'claimed'

  }, {

    responseText,

    responseUrl,

    status: 'submitted'

  }, {

    new: true

  });

  if (!request) {

    return fail(res, 409, 'REQUEST_UNAVAILABLE');

  }

  res.json({ request });

}));


// ================= ACCEPT AND DISTRIBUTE BOUNTY =================

router.post('/:id/accept', wrap(async (req, res) => {

  const request = await SkillRequest.findOneAndUpdate({

    _id: req.params.id,

    student: req.user._id,

    status: 'submitted'

  }, {

    status: 'accepted'

  }, {

    new: true

  });

  if (!request) {

    return fail(res, 409, 'REQUEST_UNAVAILABLE');

  }

  const creatorShare =
    request.urgency === 'urgent' ? 3 : 2;

  const treasuryShare =
    request.bounty - creatorShare;

  await credit(

    request.creator,

    creatorShare,

    'creator_earn',

    `Skill Request: ${request.title}`

  );

  await Transaction.create({

    user: null,

    type: 'treasury_in',

    amount: treasuryShare,

    note: `Skill Request: ${request.title}`

  });

  res.json({

    success: true,

    creatorShare,

    treasuryShare

  });

}));


export default router;