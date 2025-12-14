import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import Constant from '../util/constant.js';
import suggestService from '../service/suggestService.js';
import searchService from '../service/searchService.js';

const router = express.Router();

router.get(
  '/job',
  authMiddleware,
  async (req, res) => {
    try {
      const { search_input } = req.query;
      const search = await suggestService.suggestJob(search_input, req.user.email);
      return res.status(200).json({
        success: true,
        data: {
          search_id: search.id,
        },
        message: 'Job suggested successfully',
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
  '/job/:search_id',
  authMiddleware,
  async (req, res) => {
    try {
      const { search_id } = req.params;
      const search = await searchService.getSearchById(search_id);
      
      if (!search) {
        return res.status(404).json({
          success: false,
          message: 'Search not found',
          error: 'NOT_FOUND'
        });
      }

      return res.status(200).json({
        success: true,
        data: search,
        message: 'Search retrieved successfully',
      });
    }
    catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { email } = req.user;
    const history = await searchService.getHistory(email);
    return res.status(200).json({
      success: true,
      data: history,
      message: 'History retrieved successfully',
    });
  }
  catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});


export default router;
