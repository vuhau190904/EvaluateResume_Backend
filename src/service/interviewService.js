import prisma from '../database/prisma.js';
import Constant from '../util/constant.js';
import redisClient from '../database/redis.js';
import searchService from './searchService.js';
import { v4 as uuidv4 } from 'uuid';
class InterviewService {
  async start(search_input, userEmail) {
    try {
      console.log('search_input', search_input);
      const search = await searchService.createSearch(uuidv4(), userEmail, Constant.PENDING, search_input);
      console.log('search', search);
      await redisClient.sendToQueue(process.env.SUGGEST_QUEUE_NAME, 'suggest-job', {searchId: search.id});
      return search;
    } catch (error) {
      throw new Error('Failed to suggest job: ' + error.message);
    }
  }
}

const suggestService = new SuggestService();
export default suggestService;
