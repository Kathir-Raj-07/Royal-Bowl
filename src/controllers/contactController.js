const nodemailer = require("nodemailer");
require("dotenv").config();

exports.sendContactEmail = async (req, res) => {
    const { name, email, message } = req.body;

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: email,
            to: process.env.OWNER_EMAIL,
            subject: "New Contact Message",
            text: `From: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        });

        res.json({ success: true, message: "Email sent successfully..." });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ success: false, message: "Failed to send a email" });
    }
};
