import { variables } from 'lib/config';

/** The URL to where the user will be redirected when clicking the email link */
const CLIENT_MANAGEMENT_URL = variables.devMode
  ? `http://localhost:${variables.CLIENT_PORT}/management`
  : 'https://starburst-app.herokuapp.com/management';

type Params = {
  email: string;
  code: string;
};

/**
 * Generates the HTML content of the email used to proceed with the recovery email.
 * @param code The action code that will be used by the client to perform the
 * password recovery action.
 * @param email The email of the account related to the action, is called email,
 * but is used only to display an identifier, something like username can be used here too,
 * since is only showed, doesn't represent the reciever of the email.
 * @returns The HTML content of the email.
 */
const generatePasswordRecoveryEmail = ({ code, email }: Params) => `
  Hello,
  <br />
  <br />
  A <strong>password recovery</strong> has been requested for the Starburst account: ${email}.
  <br />
  To proceed with this action,
  <a href="${CLIENT_MANAGEMENT_URL}?mode=password-recovery&code=${code}">
    click here
  </a>

  <br />
  If you haven't requested this, please ignore this email.
  Best regards, Starburst team.
`;

export { generatePasswordRecoveryEmail };
