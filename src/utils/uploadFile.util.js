const fs = require("fs/promises");
const path = require("path");

const removeUploadedFile = async (fileName) => {
  if (!fileName || !process.env.UPLOADS_BASE_PATH) {
    return;
  }

  const absolutePath = path.join(process.env.UPLOADS_BASE_PATH, fileName);

  try {
    await fs.unlink(absolutePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn(`Failed to delete uploaded file: ${absolutePath}`, err.message);
    }
  }
};

module.exports = {
  removeUploadedFile
};
