import multer from 'multer';

export const singleFileUpload = (fieldName) => (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 10MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf' || file.mimetype === 'audio/wav' || file.mimetype === 'audio/flac' || file.mimetype === 'audio/mp3') {
        cb(null, true);
      } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF, WAV, FLAC, MP3 files are allowed!'));
      }
    }
  }).single(fieldName);

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      let message = 'File upload error';
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'File too large. Maximum allowed size is 50MB.';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        message = 'Only one PDF, WAV, FLAC, MP3 file can be uploaded per request and file must be a PDF, WAV, FLAC, MP3.';
      }
      return res.status(400).json({ success: false, message, error: err.code });
    } else if (err) {
      return res.status(500).json({ success: false, message: 'Internal server error during file upload', error: err.message });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'File is required', error: 'NO_FILE' });
    }
    // fileFilter đã kiểm tra mimetype, nên ở đây chỉ cần đảm bảo có file
    next();
  });
};
