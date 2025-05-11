import express from "express";
import multer from 'multer';
import {
    uploadImage,
    getSMS,
    smsLogin
} from "../controllers/commonController.js";
// 配置multer用于处理文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 临时存储目录
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // 生成唯一的文件名
  },
});

const upload = multer({ storage: storage });
const router = express.Router();
router.post('/upload', upload.single('file'), uploadImage);
router.post('/sms', getSMS);
router.post('/smsLogin', smsLogin);
export default router;