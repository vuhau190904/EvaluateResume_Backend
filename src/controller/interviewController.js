import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import Constant from '../util/constant.js';
import redisClient from '../database/redis.js';
import { singleFileUpload } from '../middleware/fileMiddleware.js';
import OpenAI from 'openai';
import { Readable } from 'stream';


const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.get(
  '/start',
  authMiddleware,
  async (req, res) => {
    try {
      const { resume_id } = req.query;
      await redisClient.sendToQueue(process.env.INTERVIEW_QUEUE_NAME, 'interview-job', {resumeId: resume_id, start: true});
      return res.status(200).json({
        success: true,
        message: 'Start interview successfully, wait to generate interview questions',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

router.get(
  '/end',
  authMiddleware,
  async (req, res) => {
    try {
      const { resume_id } = req.query;
      await redisClient.sendToQueue(process.env.INTERVIEW_QUEUE_NAME, 'interview-job', {resumeId: resume_id, start: false});
      return res.status(200).json({
        success: true,
        message: 'End interview successfully, wait to feedback',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);


router.get(
  '/get-question',
  authMiddleware,
  async (req, res) => {
    try {
      const { resume_id } = req.query;
      const interviewQuestion = await prisma.interview.findMany({
        where: {
          resumeId: resume_id
        },
        orderBy: { order: 'asc' }
      });
      if (interviewQuestion.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No interview question found',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Get interview question successfully',
        data: interviewQuestion
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

router.post("/submit-answer", authMiddleware, async (req, res) => {
  try {
    const { question_id, answer } = req.query;
    console.log(req.query);
    await prisma.interview.update({
      where: { id: question_id },
      data: { user_response: answer }
    });
    return res.status(200).json({
      success: true,
      message: 'Submit answer successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.get("/feedback", authMiddleware, async (req, res) => {
  try {
    const { resume_id } = req.query;
    if (!resume_id) {
      return res.status(400).json({
        success: false,
        message: "Missing resume_id parameter",
      });
    }

    const resume = await prisma.resumes.findUnique({
      where: { id: resume_id },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get feedback successfully",
      data: resume.interview_result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});


router.post(
  '/speech-to-text',
  authMiddleware,
  singleFileUpload('file'),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Audio file is required',
        });
      }

      // Convert buffer to a readable stream and attach a filename
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);
      // OpenAI SDK uses the file's path/name to infer format, so we set it here
      stream.path = file.originalname || 'audio.webm';

      const response = await openai.audio.transcriptions.create({
        file: stream,
        model: 'whisper-1',
        language: 'en',
      });

      const transcription = (response.text || '').trim();

      return res.status(200).json({
        success: true,
        message: 'Transcribed audio successfully',
        data: transcription,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
);

export default router;
