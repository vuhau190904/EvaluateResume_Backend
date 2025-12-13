import prisma from '../database/prisma.js';
import Constant from '../util/constant.js';

class ResumeService {
  async createResume(id, userEmail, file, jobDescription) {
    try {
        console.log('userEmail', userEmail);
      const resume = await prisma.resumes.create({
        data: {
          id: id,
          user_email: userEmail,
          status: Constant.PENDING,
          file_name: file.originalname,
          jobDescription: jobDescription,
        },
      });
      return resume;
    } catch (error) {
      throw new Error(`Failed to create resume: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const resume = await prisma.resumes.findUnique({
        where: { id }
      });
      return resume;
    } catch (error) {
      return null;
    }
  }

  async updateResume(id, updateData) {
    try {
      const updatedResume = await prisma.resumes.update({
        where: { id },
        data: updateData
      });
      return updatedResume;
    } catch (error) {
      throw new Error(`Failed to update resume: ${error.message}`);
    }
  }

  async findByUserEmail(userEmail) {
    try {
      const resumes = await prisma.resumes.findMany({
        where: { user_email: userEmail },
        orderBy: { created_at: 'desc' }
      });
      return resumes;
    } catch (error) {
      throw new Error(`Failed to find resumes: ${error.message}`);
    }
  }
}

const resumeService = new ResumeService();

export default resumeService;

