const WrapAsync = require("../Utils/WrapAsync");
const PrismaClient = require('@prisma/client').PrismaClient;
const ExpressError = require("../Utils/ExpressError");
const sendMail = require("../Utils/sendMail");
const moment = require('moment');
const prisma = new PrismaClient();

module.exports.generate = WrapAsync(async (req, res, next) => {
    const { mail, name } = req.body;
    if (!mail || !name) {
        return next(new ExpressError("Missing Details", 400));
    }

    const otp = Math.floor(Math.random() * 900000) + 100000;

    const options = {
        mail: mail,
        subject: "Refer And Earn Email Verification",
        text: "Refer And Earn Email Verification",
        message: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #6366F1; text-align: center;">Refer & Earn - Email Verification</h2>
                <p>Dear ${name},</p>
                <p>Please use the OTP below to verify your email address:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <span style="
                        display: inline-block;
                        background-color: #f8f9fa;
                        padding: 12px 24px;
                        font-size: 20px;
                        font-weight: bold;
                        color: #6366F1;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                        letter-spacing: 2px;
                    ">${otp}</span>
                </div>
                <p style="text-align: center; color: #555; font-size: 14px; margin-top: 16px;">
                    <strong>Note:</strong> This OTP will expire in <strong>1 hour</strong>.
                </p>
            </div>
        `
    };

    const mailResponse = await sendMail(options);
    if (!mailResponse) {
        return next(new ExpressError("Failed to Send OTP", 500));
    }

    try {
        const existingReferral = await prisma.verifyReferral.findUnique({
            where: { referrerEmail: mail }
        });

        if (!existingReferral) {
            await prisma.verifyReferral.create({
                data: {
                    referrerName: name,
                    referrerEmail: mail,
                    otp: otp.toString()
                }
            });
        } else {
            await prisma.verifyReferral.update({
                where: { referrerEmail: mail },
                data: {
                    otp: otp.toString(),
                    updatedAt: new Date()
                }
            });
        }

        return res.status(200).json({ message: "Verification Code Sent Successfully" });
    } catch (error) {
        return next(new ExpressError("Database Error", 500));
    }
});


module.exports.verify = WrapAsync(async (req, res, next) => {
    const { mail, otp } = req.body;
    if (!mail || !otp) {
        return next(new ExpressError("Email and OTP are required", 400));
    }

    try {
        const existingReferral = await prisma.verifyReferral.findFirst({
            where: { referrerEmail: mail, otp }
        });

        if (!existingReferral) {
            return next(new ExpressError("Invalid OTP or Email", 400));
        }

        const updatedAt = moment.utc(existingReferral.updatedAt);
        const oneHourAgo = moment.utc().subtract(1, 'hours');
        if (updatedAt.isBefore(oneHourAgo)) {
            return next(new ExpressError("OTP Expired. Please request a new one.", 400));
        }

        await prisma.verifyReferral.update({
            where: { referrerEmail: mail },
            data: { otpVerified: true }
        });

        const referrerDetails = await prisma.referrer.findUnique({
            where: { referrerEmail: mail }
        });

        const data = referrerDetails || {
            referrerEmail: mail,
            referrerName: existingReferral.referrerName
        };

        return res.status(200).json({ message: "OTP Verification Success", data });
    } catch (error) {
        console.error("OTP Verification Error:", error);
        return next(new ExpressError("Internal Server Error", 500));
    }
});
