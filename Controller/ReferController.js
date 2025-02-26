const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const WrapAsync = require("../Utils/WrapAsync");
const ExpressError = require("../Utils/ExpressError");
const sendMail = require("../Utils/sendMail");

module.exports.refer = WrapAsync(async (req, res, next) => {
    const bodyData = req.body;

    try {
        if (!bodyData.refereeEmail || !bodyData.referrerEmail) {
            throw new ExpressError("Missing required email fields", 400);
        }

        const validCourses = ['WEB_DEVELOPMENT', 'DATA_SCIENCE', 'MACHINE_LEARNING', 
                             'MOBILE_APP_DEVELOPMENT', 'CYBER_SECURITY', 'CLOUD_COMPUTING', 
                             'DIGITAL_MARKETING', 'UI_UX_DESIGN', 'SOFTWARE_TESTING', 
                             'ARTIFICIAL_INTELLIGENCE'];
        
        if (!validCourses.includes(bodyData.course)) {
            throw new ExpressError(`Invalid course type. Must be one of: ${validCourses.join(', ')}`, 400);
        }

        const result = await prisma.$transaction(async (tx) => {
            const verifyReferral = await tx.verifyReferral.findUnique({
                where: { referrerEmail: bodyData.referrerEmail }
            });

            if (!verifyReferral || !verifyReferral.otpVerified) {
                throw new ExpressError("Email not verified", 400);
            }

            let referrer = await tx.referrer.findUnique({
                where: { referrerEmail: bodyData.referrerEmail }
            });

            if (!referrer) {
                referrer = await tx.referrer.create({
                    data: {
                        referrerName: bodyData.referrerName,
                        referrerEmail: bodyData.referrerEmail,
                        referrerPhone: bodyData.referrerPhone || null,
                        referralMessage: bodyData.referralMessage || null,
                        howDidYouHear: bodyData.howDidYouHear || null,
                        termsAccepted: bodyData.termsAccepted || false
                    }
                });
            } else {
             
                await tx.referrer.update({
                    where: { referrerEmail: bodyData.referrerEmail },
                    data: {
                        referrerName: bodyData.referrerName,
                        referrerPhone: bodyData.referrerPhone || referrer.referrerPhone,
                        referralMessage: bodyData.referralMessage || referrer.referralMessage,
                        howDidYouHear: bodyData.howDidYouHear || referrer.howDidYouHear,
                        termsAccepted: bodyData.termsAccepted || referrer.termsAccepted
                    }
                });
            }

            
            const existingReferee = await tx.referee.findFirst({
                where: {
                    referrerId: referrer.id,
                    refereeEmail: bodyData.refereeEmail
                }
            });

            if (existingReferee) {
                throw new ExpressError("Referee has already been referred by this referrer", 400);
            }

            const referee = await tx.referee.create({
                data: {
                    referrerId: referrer.id,
                    refereeName: bodyData.refereeName,
                    refereeEmail: bodyData.refereeEmail,
                    refereePhone: bodyData.refereePhone || null,
                    course: bodyData.course,
                    startDate: bodyData.startDate ? new Date(bodyData.startDate) : null,
                    relationship: bodyData.relationship
                }
            });

            await tx.verifyReferral.delete({
                where: { referrerEmail: bodyData.referrerEmail }
            });

            return { 
                success: true, 
                referrerId: referrer.id,
                refereeId: referee.id
            };
        }, {
            timeout: 15000
        });
        const frontendUrl = process.env.FRONTEND_URL || 'https://example.com';
        const referrerEmailData = referrerMail(bodyData, frontendUrl);
        const refereeEmailData = refereeMail(bodyData, frontendUrl);

        try {
          
            await Promise.all([
                sendMail(referrerEmailData),
                sendMail(refereeEmailData)
            ]);
        } catch (emailError) {
            console.error("Failed to send email:", emailError);
        }
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Referral error:", err);
        return next(new ExpressError(err.message || "Server Error", err.status || 500));
    }
});
const referrerMail = (bodyData, frontendUrl) => {
    const formattedDate = new Date(bodyData.startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return {
        mail: bodyData.referrerEmail,
        subject: `Your Referral to ${bodyData.refereeName} was Successful!`,
        text: `Your referral to ${bodyData.refereeName} for ${bodyData.course} was successful`,
        message: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%); padding: 25px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h2 style="color: white; margin: 0; font-weight: bold; font-size: 26px;">Refer & Earn</h2>
                    <p style="color: white; margin-top: 8px; font-size: 18px;">Referral Successful!</p>
                </div>
                
                <div style="padding: 32px; background-color: white; border-radius: 0 0 12px 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);">
                    <p style="font-size: 17px;">Dear ${bodyData.referrerName},</p>
                    
                    <div style="background-color: #f4f7ff; border-left: 4px solid #6366F1; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; font-size: 16px;">
                            <span style="font-weight: bold; color: #6366F1;">Great news!</span> Your referral of <span style="font-weight: bold;">${bodyData.refereeName}</span> for the 
                            <span style="font-weight: bold; color: #6366F1;">${bodyData.course.replace(/_/g, ' ').toLowerCase()}</span> course was successful!
                        </p>
                    </div>
                    
                    <p style="font-size: 16px;">We've sent ${bodyData.refereeName} a confirmation email with all the details they need. 
                    ${bodyData.startDate ? `The course will start on <span style="font-weight: bold;">${formattedDate}</span>.` : ''}</p>
                    
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 18px; margin: 25px 0; border: 1px dashed #d1d5db;">
                        <p style="margin: 0; text-align: center; font-size: 15px;">
                            <span style="color: #6366F1; font-weight: bold;">Remember:</span> You'll receive your referral bonus once ${bodyData.refereeName} completes their enrollment process.
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="${frontendUrl}" style="
                            display: inline-block;
                            background: linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%);
                            color: white;
                            text-decoration: none;
                            padding: 14px 28px;
                            border-radius: 8px;
                            font-weight: 500;
                            font-size: 16px;
                            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
                            transition: all 0.3s ease;
                        ">Open Site</a>
                    </div>
                    
                    <p style="margin-top: 30px; color: #555;">Best regards,<br><span style="font-weight: bold;">Refer & Earn Team</span></p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
                        This is an automated message. Please do not reply to this email.
                        <p style="margin-top: 8px; margin-bottom: 0;">© ${new Date().getFullYear()} Refer & Earn. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `
    };
};

const refereeMail = (bodyData, frontendUrl) => {
    const formattedDate = bodyData.startDate ? new Date(bodyData.startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'the scheduled date';

    const referralMessageSection = bodyData.referralMessage ? `
        <div style="background-color: #f4f7ff; border-left: 4px solid #8B5CF6; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 16px; font-style: italic; color: #6366F1;">
                <span style="font-weight: bold;">Message from ${bodyData.referrerName}:</span>
            </p>
            <p style="margin: 10px 0 0 0; font-size: 16px;">
                "${bodyData.referralMessage}"
            </p>
        </div>
    ` : '';

    return {
        mail: bodyData.refereeEmail,
        subject: `You've Been Referred to Our ${bodyData.course.replace(/_/g, ' ').toLowerCase()} Course!`,
        text: `${bodyData.referrerName} has referred you to our ${bodyData.course.replace(/_/g, ' ').toLowerCase()} course`,
        message: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%); padding: 25px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h2 style="color: white; margin: 0; font-weight: bold; font-size: 26px;">Refer & Earn</h2>
                    <p style="color: white; margin-top: 8px; font-size: 18px;">You've Been Referred!</p>
                </div>
                
                <div style="padding: 32px; background-color: white; border-radius: 0 0 12px 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);">
                    <p style="font-size: 17px;">Dear ${bodyData.refereeName},</p>
                    
                    <div style="background-color: #f4f7ff; border-left: 4px solid #6366F1; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; font-size: 16px;">
                            <span style="font-weight: bold; color: #6366F1;">Exciting news!</span> Your ${bodyData.relationship} <span style="font-weight: bold;">${bodyData.referrerName}</span> has referred you to our 
                            <span style="font-weight: bold; color: #6366F1;">${bodyData.course.replace(/_/g, ' ').toLowerCase()}</span> course!
                        </p>
                    </div>
                    
                    ${referralMessageSection}
                    
                    <p style="font-size: 16px;">We're thrilled to welcome you to our learning community. The ${bodyData.course.replace(/_/g, ' ').toLowerCase()} course will begin on <span style="font-weight: bold;">${formattedDate}</span>.</p>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="${frontendUrl}" style="
                            display: inline-block;
                            background: linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%);
                            color: white;
                            text-decoration: none;
                            padding: 14px 28px;
                            border-radius: 8px;
                            font-weight: 500;
                            font-size: 16px;
                            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
                            transition: all 0.3s ease;
                        ">Open Site</a>
                    </div>
                    
                    <p style="margin-top: 20px; font-size: 15px; text-align: center; color: #555;">Please confirm your enrollment before <span style="font-weight: bold;">${formattedDate}</span> to secure your spot.</p>
                    
                    <p style="margin-top: 30px; color: #555;">Looking forward to seeing you in class!<br><span style="font-weight: bold;">Refer & Earn Team</span></p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
                        This is an automated message. Please do not reply to this email.
                        <p style="margin-top: 8px; margin-bottom: 0;">© ${new Date().getFullYear()} Refer & Earn. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `
    };
};