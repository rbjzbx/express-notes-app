import path from 'path';
import fs from 'fs';
import OSS from 'ali-oss';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from "dotenv";
dotenv.config();
const ossClient = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
});

// 确保上传目录存在
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path); // 删除临时文件
      return res.status(400).json({ error: '仅支持JPEG、PNG和GIF格式的图片' });
    }

    // 验证文件大小 (5MB限制)
    if (req.file.size > 5 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '图片大小不能超过5MB' });
    }

    // 上传到OSS
    const result = await ossClient.put(
      `images/${Date.now()}-${req.file.originalname}`,
      path.join(process.cwd(), req.file.path)
    );

    // 清理临时文件
    fs.unlinkSync(req.file.path);

    res.status(200).json({ 
      success: true,
      url: result.url 
    });
  } catch (error) {
    console.error('上传失败:', error);
    if (req.file?.path) {
      fs.unlinkSync(req.file.path).catch(e => console.error('删除临时文件失败:', e));
    }
    res.status(500).json({ 
      error: '文件上传失败',
      details: error.message 
    });
  }
};
const JWT_SECRET = 'notes-app';
const RONG_LIAN_ACCOUNT_SID = '2c94811c92f9eb98019332dea9ee0f1f';
const RONG_LIAN_AUTH_TOKEN = '26420ab1d67f427f89ada443830957b5';
const users = {};
const generateCode=() =>{
  return Math.floor(1000 + Math.random() * 9000).toString();
}
const generateSig = (timestamp) => {
  const str = `${RONG_LIAN_ACCOUNT_SID}${RONG_LIAN_AUTH_TOKEN}${timestamp}`;
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

const sendSMS = async (phone, code) => {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // 格式: YYYYMMDDHHmmss
  const sig = generateSig(timestamp);

  const url = `https://app.cloopen.com:8883/2013-12-26/Accounts/${RONG_LIAN_ACCOUNT_SID}/SMS/TemplateSMS?sig=${sig}`;

  const base64Credentials = Buffer.from(`${RONG_LIAN_ACCOUNT_SID}:${RONG_LIAN_AUTH_TOKEN}`).toString('base64');

  const response = await axios.post(url, {
    to: phone,
    appId: '2c94811c92f9eb98019332deaba0f26',
    templateId: '1',
    datas: [code, '5']
  }, {
    auth: {
      username: RONG_LIAN_ACCOUNT_SID,
      password: RONG_LIAN_AUTH_TOKEN
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${base64Credentials}`,
      'Timestamp': timestamp // 必须与签名使用的timestamp一致
    }
  });
 console.log('容联云完整响应:', response.data);
  return response.data;
};

export const getSMS= async (req, res) => {
  const { phone } = req.body;
  const code = generateCode();
  
  try {
    await sendSMS(phone, code);
    users[phone] = { code, expires: Date.now() + 300000 }; // 5分钟有效期
    res.json({ success: true ,data: code});
  } catch (error) {
    console.error('短信发送失败:', error);
    res.status(500).json({ error: '短信发送失败' });
  }
};
export const smsLogin= (req, res) => {
  const { phone, code } = req.body;
  const user = users[phone];
  
  if (!user || user.code !== code) {
    return res.status(401).json({ error: '验证码错误' });
  }
  
  if (Date.now() > user.expires) {
    return res.status(401).json({ error: '验证码已过期' });
  }
  
  // 生成JWT
  const token = jwt.sign({ phone }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
};

// 受保护的路由示例
// app.get('/api/profile', authenticateToken, (req, res) => {
//   res.json({ phone: req.user.phone });
// });

// JWT验证中间件
const authenticateToken=(req, res, next)=> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}