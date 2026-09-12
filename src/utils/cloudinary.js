/**
 * Utility for uploading images to Cloudinary via REST API.
 * Uses unsigned upload preset configured in Cloudinary dashboard.
 */

export async function uploadToCloudinary(file, customOptions = {}) {
  const cloudName =
    customOptions.cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset =
    customOptions.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName) {
    throw new Error(
      'Cloudinary Cloud Name is missing. Please set VITE_CLOUDINARY_CLOUD_NAME in your .env.local file.'
    );
  }

  if (!uploadPreset) {
    throw new Error(
      'Cloudinary Upload Preset is missing. Please create an unsigned upload preset in your Cloudinary Dashboard (Settings > Upload > Upload Presets) and set VITE_CLOUDINARY_UPLOAD_PRESET in your .env.local file.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  if (import.meta.env.VITE_CLOUDINARY_API_KEY) {
    formData.append('api_key', import.meta.env.VITE_CLOUDINARY_API_KEY);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data.error?.message || `Upload failed with status ${response.status}`;
      throw new Error(`Cloudinary error: ${errorMessage}`);
    }

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      url: data.url,
      format: data.format,
      width: data.width,
      height: data.height,
    };
  } catch (err) {
    console.error('Error uploading to Cloudinary:', err);
    throw err;
  }
}
