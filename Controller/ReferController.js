const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const WrapAsync = require("../Utils/WrapAsync");
const ExpressError = require("../Utils/ExpressError");
const sendMail = require("../Utils/sendMail");

module.exports.refer = WrapAsync(async (req, res, next) => {
    const bodyData = req.body;

    try {
       
        const result = await prisma.$transaction(async (prisma) => {
           
            const verifyReferral = await prisma.verifyReferral.findUnique({
                where: { referrerEmail: bodyData.referrer_email }
            });

            if (!verifyReferral || !verifyReferral.otpVerified) {
                throw new ExpressError("Mail not verified", 400);
            }
            let referrer = await prisma.referrer.findUnique({
                where: { referrerEmail: bodyData.referrer_email }
            });

            if (!referrer) {
                referrer = await prisma.referrer.create({
                    data: {
                        referrerName: bodyData.referrer_name,
                        referrerEmail: bodyData.referrer_email,
                        referrerPhone: bodyData.referrer_phone,
                        referralMessage: bodyData.referral_message,
                        howDidYouHear: bodyData.how_did_you_hear,
                        termsAccepted: bodyData.terms_accepted
                    }
                });
            } else {
                await prisma.referrer.update({
                    where: { referrerEmail: bodyData.referrer_email },
                    data: {
                        referrerName: bodyData.referrer_name,
                        referrerPhone: bodyData.referrer_phone,
                        referralMessage: bodyData.referral_message,
                        howDidYouHear: bodyData.how_did_you_hear,
                        termsAccepted: bodyData.terms_accepted
                    }
                });
            }

            const existingReferee = await prisma.referee.findFirst({
                where: {
                    referrerId: referrer.id,
                    refereeEmail: bodyData.referee_email
                }
            });

            if (existingReferee) {
                throw new ExpressError("Referee has already been referred by this referrer", 400);
            }

            await prisma.verifyReferral.delete({
                where: { referrerEmail: bodyData.referrer_email }
            });

            
            await prisma.referee.create({
                data: {
                    referrerId: referrer.id,
                    refereeName: bodyData.referee_name,
                    refereeEmail: bodyData.referee_email,
                    refereePhone: bodyData.referee_phone,
                    course: bodyData.course,
                    startDate: new Date(bodyData.start_date),
                    relationship: bodyData.relationship
                }
            });

            const referrerData = await sendMail(referrerMail(bodyData));
            const refereeData = await sendMail(refereeMail(bodyData));

            if (!refereeData || !referrerData) {
                throw new ExpressError("Failed to Send Email", 500);
            }

            return { success: true };
        });
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        return next(new ExpressError(err.message || "Server Error", 500));
    }
});


const referrerMail = (bodyData) => {
    return {
        mail: bodyData.referrer_email,
        subject: `Your Referral to ${bodyData.referee_name} was Successful!`,
        text: `Your referral to ${bodyData.referee_name} for ${bodyData.course} was successful`,
        message: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%); padding: 25px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h2 style="color: white; margin: 0; font-weight: bold; font-size: 26px;">Refer & Earn</h2>
                    <p style="color: white; margin-top: 8px; font-size: 18px;">Referral Successful!</p>
                </div>
                
                <div style="padding: 32px; background-color: white; border-radius: 0 0 12px 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);">
                    <p style="font-size: 17px;">Dear ${bodyData.referrer_name},</p>
                    
                    <div style="background-color: #f4f7ff; border-left: 4px solid #6366F1; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; font-size: 16px;">
                            <span style="font-weight: bold; color: #6366F1;">Great news!</span> Your referral of <span style="font-weight: bold;">${bodyData.referee_name}</span> for the 
                            <span style="font-weight: bold; color: #6366F1;">${bodyData.course}</span> course was successful!
                        </p>
                    </div>
                    
                    <p style="font-size: 16px;">We've sent ${bodyData.referee_name} a confirmation email with all the details they need. The course will start on <span style="font-weight: bold;">${bodyData.start_date}</span>.</p>
                    
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 18px; margin: 25px 0; border: 1px dashed #d1d5db;">
                        <p style="margin: 0; text-align: center; font-size: 15px;">
                            <span style="color: #6366F1; font-weight: bold;">Remember:</span> You'll receive your referral bonus once ${bodyData.referee_name} completes their enrollment process.
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href=${process.env.FRONTEND_URL} style="
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
                        <p style="margin-top: 8px; margin-bottom: 0;">© 2025 Refer & Earn. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `
    };
}

const refereeMail = (bodyData) => {
    const referralMessageSection = bodyData.referral_message ? `
        <div style="background-color: #f4f7ff; border-left: 4px solid #8B5CF6; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 16px; font-style: italic; color: #6366F1;">
                <span style="font-weight: bold;">Message from ${bodyData.referrer_name}:</span>
            </p>
            <p style="margin: 10px 0 0 0; font-size: 16px;">
                "${bodyData.referral_message}"
            </p>
        </div>
    ` : '';

    return {
        mail: bodyData.referee_email,
        subject: `You've Been Referred to Our ${bodyData.course} Course!`,
        text: `${bodyData.referrer_name} has referred you to our ${bodyData.course} course`,
        message: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%); padding: 25px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h2 style="color: white; margin: 0; font-weight: bold; font-size: 26px;">Refer & Earn</h2>
                    <p style="color: white; margin-top: 8px; font-size: 18px;">You've Been Referred!</p>
                </div>
                
                <div style="padding: 32px; background-color: white; border-radius: 0 0 12px 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);">
                    <p style="font-size: 17px;">Dear ${bodyData.referee_name},</p>
                    
                    <div style="background-color: #f4f7ff; border-left: 4px solid #6366F1; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; font-size: 16px;">
                            <span style="font-weight: bold; color: #6366F1;">Exciting news!</span> Your ${bodyData.relationship} <span style="font-weight: bold;">${bodyData.referrer_name}</span> has referred you to our 
                            <span style="font-weight: bold; color: #6366F1;">${bodyData.course}</span> course!
                        </p>
                    </div>
                    
                    ${referralMessageSection}
                    
                    <p style="font-size: 16px;">We're thrilled to welcome you to our learning community. The ${bodyData.course} course will begin on <span style="font-weight: bold;">${bodyData.start_date}</span>.</p>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href=${process.env.FRONTEND_URL} style="
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
                    
                    <p style="margin-top: 20px; font-size: 15px; text-align: center; color: #555;">Please confirm your enrollment before <span style="font-weight: bold;">${bodyData.start_date}</span> to secure your spot.</p>
                    
                    <p style="margin-top: 30px; color: #555;">Looking forward to seeing you in class!<br><span style="font-weight: bold;">Refer & Earn Team</span></p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
                        This is an automated message. Please do not reply to this email.
                        <p style="margin-top: 8px; margin-bottom: 0;">© 2025 Refer & Earn. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `
    };
}