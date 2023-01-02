const nodemailer = require("nodemailer");
const pug = require("pug");

// choosed SMTP because I use nodemailer and create a transport
// shoul be like this new Email(user,url).sendwelcome();

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName = user.name.split(" ")[0];
        this.url = url;
        this.from = `Mr. Lapanta <${process.env.EMAIL_FROM}>`;
    }
    newTransport() {
        return nodemailer.createTransport({
            service: "SendGrid",
            auth: {
                user: process.env.SENDGRID_USERNAME,
                pass: process.env.SENDGRID_PASSWORD,
            },
        });
    }

    // sending center
    async send(template, subject) {
        // render the pug
        const html = pug.renderFile(
            `${__dirname}/../views/email/${template}.pug`,
            {
                firstName: this.firstName,
                url: this.url,
                subject,
            }
        );
        // set options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
        };

        // create the transport and send email
        await this.newTransport().sendMail(mailOptions);
    }
    // for welcome
    async sendWelcome() {
        await this.send("welcome", "welcome to the natours!");
    }
    async sendPasswordReset() {
        await this.send(
            "passwordReset",
            "Your password reset token (valid for only 10 minutes)"
        );
    }
};
