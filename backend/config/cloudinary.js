const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim().replace(/\s+/g, '_');
const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

const fs = require('fs');
const path = require('path');

/**
 * Save image buffer locally inside uploads/student_photos
 */
const saveBufferLocally = (fileBuffer, mimeType = 'image/jpeg') => {
  try {
    const photosDir = path.join(__dirname, '../uploads/student_photos');
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
    }
    const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg';
    const filename = `photo_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    const filePath = path.join(photosDir, filename);
    fs.writeFileSync(filePath, fileBuffer);

    console.log(`📸 Saved student photo locally to: /uploads/student_photos/${filename}`);
    return {
      url: `/uploads/student_photos/${filename}`,
      public_id: `local_${filename}`
    };
  } catch (err) {
    console.error('Error saving photo locally:', err);
    const base64Str = fileBuffer.toString('base64');
    return {
      url: `data:${mimeType};base64,${base64Str}`,
      public_id: `base64_${Date.now()}`
    };
  }
};

/**
 * Upload image buffer to Cloudinary with timeout & local fallback safety net
 * @param {Buffer} fileBuffer - Image buffer from multer
 * @param {string} folder - Target Cloudinary folder name
 * @param {string} mimeType - Image mimetype
 * @returns {Promise<{ url: string, public_id: string }>}
 */
const uploadToCloudinary = (fileBuffer, folder = 'student_photos', mimeType = 'image/jpeg') => {
  return new Promise((resolve) => {
    const rawCloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    const cleanCloudName = rawCloudName.replace(/\s+/g, '_');
    const curApiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
    const curApiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

    // Fallback to local upload if missing credentials
    if (!rawCloudName || !curApiKey) {
      console.warn('⚠️ Cloudinary credentials missing. Saving uploaded photo locally.');
      return resolve(saveBufferLocally(fileBuffer, mimeType));
    }

    // Always re-apply sanitized config (removes spaces from cloud_name)
    cloudinary.config({
      cloud_name: cleanCloudName,
      api_key: curApiKey,
      api_secret: curApiSecret
    });

    let isResolved = false;

    // Timeout safety net (5 seconds)
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.warn('⚠️ Cloudinary upload timed out (5s). Saving uploaded photo locally.');
        resolve(saveBufferLocally(fileBuffer, mimeType));
      }
    }, 5000);

    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 600, height: 600, crop: 'fill', gravity: 'face' }
          ]
        },
        (error, result) => {
          clearTimeout(timeout);
          if (isResolved) return;
          isResolved = true;

          if (error) {
            console.error('Cloudinary Upload Warning (saving uploaded photo locally):', error.message || error);
            return resolve(saveBufferLocally(fileBuffer, mimeType));
          }

          resolve({
            url: result.secure_url,
            public_id: result.public_id
          });
        }
      );

      uploadStream.end(fileBuffer);
    } catch (err) {
      clearTimeout(timeout);
      if (!isResolved) {
        isResolved = true;
        console.warn('Cloudinary Stream Error (saving uploaded photo locally):', err.message || err);
        resolve(saveBufferLocally(fileBuffer, mimeType));
      }
    }
  });
};

/**
 * Delete image from Cloudinary or local storage
 * @param {string} publicId - Cloudinary image public_id or local public_id
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId || publicId.startsWith('dev_student_')) {
    return;
  }

  if (publicId.startsWith('local_')) {
    try {
      const filename = publicId.replace('local_', '');
      const filePath = path.join(__dirname, '../uploads/student_photos', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Local photo deleted (${filename})`);
      }
    } catch (err) {
      console.error('Error deleting local photo:', err);
    }
    return;
  }

  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) return;
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Cloudinary Image Deleted (${publicId}):`, result);
    return result;
  } catch (error) {
    console.error(`Error deleting image from Cloudinary (${publicId}):`, error);
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary
};
