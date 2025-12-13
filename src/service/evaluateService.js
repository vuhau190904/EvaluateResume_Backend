import { PDFParse } from 'pdf-parse';
import gcsService from './gcsService.js';
import redisClient from '../database/redis.js';
import resumeService from './resumeService.js';
import dotenv from 'dotenv';
dotenv.config();

class EvaluateService {
  constructor() {
  }

  async extractTextFromPDF(fileBuffer) {
    try {
      const parser = new PDFParse({ data: fileBuffer });
      const textResult = await parser.getText();
      await parser.destroy();
      return textResult.text;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  async evaluateResume(id, userEmail, file, jobDescription) {
    try {
      const resumeText = await this.extractTextFromPDF(file.buffer);
      const resume = await resumeService.createResume(id, userEmail, file, jobDescription);
      console.log('resume', resume);
      await gcsService.uploadImage('resumes', file, resume.id);
      await redisClient.sendToQueue(process.env.EVALUATE_QUEUE_NAME, 'evaluate-job', {
        resumeId: resume.id,
        resumeText: resumeText,
        jobDescription: jobDescription,
      });


      return {
        resumeText,
        jobDescription,
      };
    } catch (error) {
      throw new Error(`Failed to evaluate resume: ${error.message}`);
    }
  }
}

const evaluateService = new EvaluateService();

export default evaluateService;

