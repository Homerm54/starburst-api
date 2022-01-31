import { variables } from 'lib/config';
import nodemailer from 'nodemailer';
import debug from 'debug';
import Mail from 'nodemailer/lib/mailer';

const log = debug('mail');

const defaultOptions = {
  from: {
    name: 'Starburst Auth System',
    address: variables.mailService.USER,
  },
};

type EmailMetadata = {
  /** ID of the message assigned by the SMTP server */
  id: string;

  /** Array of receivers that accepted the email */
  accepted: Array<string | Mail.Address>;

  /** Array of receivers that rejected the email */
  rejected: Array<string | Mail.Address>;
};

type EmailSendParams = {
  to: string | Mail.Address | Array<string | Mail.Address>;
  subject: string;
  htmlBody: string;
  textBody?: string;
};

const transporter = nodemailer.createTransport(
  {
    host: variables.mailService.HOST,
    port: variables.mailService.PORT,
    auth: {
      user: variables.mailService.USER,
      pass: variables.mailService.PASSWORD,
    },
  },
  defaultOptions
);

/** Verifies SMTP configuration, and whether or not the service is available to be used */
export const checkMailServiceStatus = () => transporter.verify();

/**
 * Send a test email.
 * @returns If the email was send successfully or not.
 */
export const sendTestMail = () =>
  transporter
    .sendMail({
      to: 'omer.marquezt@gmail.com',
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
 * Sent a email to athe given email address.
 * @param to Comma separated list or an array of recipients e-mail addresses.
 * @param subject The subject of the e-mail.
 * @param htmlBody The HTML version of the message, this is the email body.
 * @param textBody The plaintext version of the message.
 * @returns The metadata of the email just sent.
 */
export const sendEmail = ({
  to,
  subject,
  htmlBody,
  textBody = undefined,
}: EmailSendParams): Promise<EmailMetadata> =>
  transporter
    .sendMail({
      to,
      subject,
      html: htmlBody,
      text: textBody,
    })
    .then((info) => {
      log(info);

      return {
        accepted: info.accepted,
        rejected: info.rejected,
        id: info.messageId,
      };
    });
