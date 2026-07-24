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

/**
 * Upload image buffer to Cloudinary with timeout & fallback safety net
 * @param {Buffer} fileBuffer - Image buffer from multer
 * @param {string} folder - Target Cloudinary folder name
 * @returns {Promise<{ url: string, public_id: string }>}
 */
const uploadToCloudinary = (fileBuffer, folder = 'student_photos') => {
  return new Promise((resolve) => {
    const rawCloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    const cleanCloudName = rawCloudName.replace(/\s+/g, '_');
    const curApiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
    const curApiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

    // Fallback if missing credentials
    if (!rawCloudName || !curApiKey) {
      console.warn('⚠️ Cloudinary credentials missing. Using fallback avatar.');
      const fakePublicId = `dev_student_${Date.now()}`;
      const fakeUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80`;
      return resolve({ url: fakeUrl, public_id: fakePublicId });
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
        console.warn('⚠️ Cloudinary upload timed out (5s). Falling back to default avatar.');
        const fakePublicId = `dev_student_${Date.now()}`;
        const fakeUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80`;
        resolve({ url: fakeUrl, public_id: fakePublicId });
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
            console.error('Cloudinary Upload Warning (using fallback avatar):', error.message || error);
            const fakePublicId = `dev_student_${Date.now()}`;
            const fakeUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80`;
            return resolve({ url: fakeUrl, public_id: fakePublicId });
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
        console.warn('Cloudinary Stream Error (using fallback avatar):', err.message || err);
        const fakePublicId = `dev_student_${Date.now()}`;
        const fakeUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80`;
        resolve({ url: fakeUrl, public_id: fakePublicId });
      }
    }
  });
};

/**
 * Delete image from Cloudinary by public ID
 * @param {string} publicId - Cloudinary image public_id
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId || publicId.startsWith('dev_student_')) {
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
