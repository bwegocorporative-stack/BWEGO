const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,

  params: async (req, file) => ({
    folder: "bwego/perfis",

    allowed_formats: ["jpg", "jpeg", "png", "webp"],

    resource_type: "image",

    public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,

    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: "limit",
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  }),
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!tiposPermitidos.includes(file.mimetype)) {
      return callback(new Error("Formato de imagem não permitido."));
    }

    callback(null, true);
  },
});

module.exports = upload;
