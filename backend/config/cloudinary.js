const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

/**
 * Upload image buffer to Cloudinary
 * @param {Buffer} fileBuffer - Image buffer from multer
 * @param {string} folder - Target Cloudinary folder name
 * @returns {Promise<{ url: string, public_id: string }>}
 */
const uploadToCloudinary = (fileBuffer, folder = 'student_photos') => {
  return new Promise((resolve, reject) => {
    // If Cloudinary credentials are not defined in development, return a placeholder URL
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.warn('⚠️ Cloudinary credentials missing in .env! Using placeholder image for development.');
      const fakePublicId = `dev_student_${Date.now()}`;
      const fakeUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80`;
      return resolve({ url: fakeUrl, public_id: fakePublicId });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 600, height: 600, crop: 'fill', gravity: 'face' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    uploadStream.end(fileBuffer);
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
