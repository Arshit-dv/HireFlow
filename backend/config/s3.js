const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure local uploads directory exists for fallback
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// AWS S3 Configuration
const s3Region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const s3Bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;

// S3 Client: automatically picks up AWS credentials from:
// 1. EC2 IAM Instance Profile (production on EC2 - no keys needed!)
// 2. Environment variables AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (if provided)
let s3Client = null;
if (s3Bucket) {
  try {
    const config = { region: s3Region };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    s3Client = new S3Client(config);
    console.log(`☁️ AWS S3 client initialized for bucket: ${s3Bucket} (${s3Region})`);
  } catch (err) {
    console.warn('⚠️ Could not initialize AWS S3 client, using local file storage:', err.message);
  }
} else {
  console.log('📁 AWS_S3_BUCKET not set — using local storage fallback for uploads (/uploads)');
}

// Multer memory storage (allows uploading to S3 or writing to local disk)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only document files (.pdf, .doc, .docx, .png, .jpg) are allowed!'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter,
});

/**
 * Uploads file buffer to S3 if configured, or saves to local disk.
 * Returns the public URL / path of the uploaded file.
 */
const uploadToStorage = async (file, folder = 'resumes') => {
  if (!file) return null;

  const timestamp = Date.now();
  const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${folder}/${timestamp}-${safeOriginalName}`;

  if (s3Client && s3Bucket) {
    try {
      const command = new PutObjectCommand({
        Bucket: s3Bucket,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3Client.send(command);
      const s3Url = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${filename}`;
      console.log(`✅ Uploaded to S3: ${s3Url}`);
      return s3Url;
    } catch (err) {
      console.error('❌ S3 upload failed, falling back to local storage:', err.message);
    }
  }

  // Local fallback
  const localFileName = `${timestamp}-${safeOriginalName}`;
  const localFilePath = path.join(uploadDir, localFileName);
  await fs.promises.writeFile(localFilePath, file.buffer);
  const localUrl = `/uploads/${localFileName}`;
  console.log(`💾 Saved locally: ${localUrl}`);
  return localUrl;
};

module.exports = {
  upload,
  uploadToStorage,
  s3Client,
  isS3Configured: !!(s3Client && s3Bucket),
};
