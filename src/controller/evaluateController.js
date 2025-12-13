import express from 'express';
import { singleFileUpload } from '../middleware/fileMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';
import evaluateService from '../service/evaluateService.js';
import resumeService from '../service/resumeService.js';
import Constant from '../util/constant.js';

const router = express.Router();

/**
 * POST /evaluate/upload
 * Nhận file (form-data field: "cv") và trường job_description (body), đi qua middleware file upload
 */
router.post(
  '/upload',
  authMiddleware,
  singleFileUpload('cv'),
  async (req, res) => {
    try {
      const file = req.file;
      const jobDescription = req.body.job_description;
      const id = req.body.id;
      console.log('id', id);


      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'File CV is required',
          error: 'MISSING_FILE'
        });
      }

      if (!jobDescription || jobDescription.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'job_description is required',
          error: 'MISSING_JOB_DESCRIPTION'
        });
      }

      const result = await evaluateService.evaluateResume(id, req.user.email, file, jobDescription);

      return res.status(200).json({
        success: true,
        message: 'Resume evaluated successfully',
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

/**
 * GET /evaluate/result/:evaluationId
 * Lấy ra evaluate_result theo evaluationId
 */
router.get(
  '/result/:evaluationId',
  authMiddleware,
  async (req, res) => {
    try {
      const { evaluationId } = req.params;

      if (!evaluationId) {
        return res.status(400).json({
          success: false,
          message: 'evaluationId is required',
          error: 'MISSING_EVALUATION_ID'
        });
      }

      const data = await resumeService.findById(evaluationId);
      if(!data) {
        return res.status(404).json({
          success: false,
          message: 'Resume not found',
          error: 'RESUME_NOT_FOUND'
        });
      }

      if(data.status === Constant.PENDING) {
        return res.status(400).json({
          success: false,
          message: 'Resume is pending',
        });
      }

      if(data.status === Constant.FAILED) {
        return res.status(500).json({
          success: false,
          message: 'Resume is failed',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Evaluate result retrieved successfully',
        data: data.evaluation_result
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
  '/history',
  authMiddleware,
  async (req, res) => {
    const userEmail = req.user.email;
    console.log('userEmail', userEmail);
    const data = await resumeService.findByUserEmail(userEmail);
    if(!data) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
        error: 'RESUME_NOT_FOUND'
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Resume history retrieved successfully',
      data: data
    });
  
});

export default router;
