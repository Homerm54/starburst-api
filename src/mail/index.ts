import { variables } from 'lib/config';
import nodemailer from 'nodemailer';
import debug from 'debug';

const log = debug('mail');

const defaultOptions = {
  from: `"Starburst Auth System" <${variables.mailService.user}>`,
};

const transporter = nodemailer.createTransport(
  {
    host: variables.mailService.host,
    port: variables.mailService.port,
    auth: {
      user: variables.mailService.user,
      pass: variables.mailService.password,
    },
  },
  defaultOptions
);

/** Verifies SMTP configuration, and whether or not the service is available to be used */
export const checkMailServiceStatus = () => transporter.verify();

/**
 * Send a test email.
 * @param to Comma separated list or an array of recipients' e-mail addresses
 * @returns If the email was send successfully or not.
 */
export const sendTestMail = (to: string) =>
  transporter
    .sendMail({
      to,
      subject: 'Email Service Test',
      html: "<b>There is a new article. It's about sending emails, check it out!</b>",
    })
    .then((info) => {
      log(info);
      return true;
    })
    .catch((error) => {
      log(error);
      return false;
    });

/**
 * Response from sending email ok:
 * {
  mail   accepted: [ 'omer.marquez54@gmail.com' ],
  mail   rejected: [],
  mail   envelopeTime: 420,
  mail   messageTime: 580,
  mail   messageSize: 385,
  mail   response: '250 2.0.0 OK  1643597224 l202sm7781294qke.66 - gsmtp',
  mail   envelope: {
  mail     from: 'omer.marquezt@gmail.com',
  mail     to: [ 'omer.marquez54@gmail.com' ]
  mail   },
  mail   messageId: '<9d8b423e-d7c6-acb8-6cf7-6db5e5b4fb86@gmail.com>'
  mail 
}
 */
