import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // Límite de 15 MB por archivo
  },
});