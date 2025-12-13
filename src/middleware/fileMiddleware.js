import multer from 'multer';

export const singleFileUpload = (fieldName) => (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
      // Chỉ nhận file pdf
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF files are allowed!'));
      }
    }
  }).single(fieldName);

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      let message = 'File upload error';
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'File too large. Maximum allowed size is 10MB.';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        message = 'Only one PDF file can be uploaded per request and file must be a PDF.';
      }
      return res.status(400).json({ success: false, message, error: err.code });
    } else if (err) {
      return res.status(500).json({ success: false, message: 'Internal server error during file upload', error: err.message });
    }
    // Check mimetype again for extra safety
    const file = req.file;
    if (!file || file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'Only PDF files are allowed!', error: 'INVALID_FILE_TYPE' });
    }
    next();
  });
};
