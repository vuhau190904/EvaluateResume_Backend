import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import Constant from '../util/constant.js';
import redisClient from '../database/redis.js';


const router = express.Router();

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

export default router;
