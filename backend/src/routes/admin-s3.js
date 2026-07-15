// routes/admin-s3.js — S3 presigned upload URLs (admin + client shared logic)
const express = require("express");
const { fail, ok } = require("../helpers");
const { getPresignedUploadUrl, buildS3Key } = require("../config/aws");
const { requireAuth } = require("../middleware/auth");
const env = require("../config/env");

// Admin presign router
const adminRouter = express.Router();
adminRouter.use(requireAuth("admin"));

adminRouter.post("/presign", async (req, res) => {
  const { fileName, fileType, taskId, fieldId } = req.body;
  if (!fileName || !fileType) return res.status(400).json(fail("fileName and fileType are required"));

  const s3Key = buildS3Key({ clientId: "admin", taskId, fieldId, fileName });
  const uploadUrl = await getPresignedUploadUrl({
    bucket: env.S3_BUCKET, key: s3Key, contentType: fileType,
  });

  return res.json(ok({ uploadUrl, s3Key, s3Bucket: env.S3_BUCKET, expiresIn: env.S3_PRESIGN_EXPIRY }, "Presigned URL generated"));
});

// Client presign router
const clientRouter = express.Router();
clientRouter.use(requireAuth("client"));

clientRouter.post("/presign", async (req, res) => {
  const clientId = req.user.sub;
  const { fileName, fileType, taskId, fieldId } = req.body;
  if (!fileName || !fileType) return res.status(400).json(fail("fileName and fileType are required"));

  const s3Key = buildS3Key({ clientId, taskId, fieldId, fileName });
  const uploadUrl = await getPresignedUploadUrl({
    bucket: env.S3_BUCKET, key: s3Key, contentType: fileType,
  });

  return res.json(ok({ uploadUrl, s3Key, s3Bucket: env.S3_BUCKET, expiresIn: env.S3_PRESIGN_EXPIRY }, "Presigned URL generated"));
});

module.exports = { adminRouter, clientRouter };
