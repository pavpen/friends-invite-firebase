import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';
import {db, IFunctionReplyPartial, IFunctionReply, IFunctionReplyData} from './admin';

const mailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: functions.config().gmail.email,
        pass: functions.config().gmail.password,
    },
});

function getEmailText(user_id)
{
    return `Greetings!

Celebrate with me.

Please, use this link to let me know how many people to expect, and add these events to your calendar:

https://friends-invite-33b03.firebaseapp.com/index.html?u=${encodeURIComponent(user_id)}

See you soon.
`;
}

function getEmailHtml(user_id)
{
    return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Pav's Escape Celebration</title>
    
        <style media="screen">
          body { background: #ECEFF1; color: rgba(0,0,0,0.87); font-family: Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; }
          #message, #error-message, #loading-message { max-width: 450px; padding: 32px 24px; border-radius: 3px; }
          #message { background: white; margin: 50px auto 16px; }
          #error-message { background: #ffe1e1; margin: 16px auto 16px; }
          #message h2 { color: #ffa100; font-weight: bold; font-size: 16px; margin: 0 0 8px; }
          #message h1 { font-size: 22px; font-weight: 300; color: rgba(0,0,0,0.6); margin: 16px 0 16px 0;}
          #message p { line-height: 140%; margin: 16px 0 24px; font-size: 14px; }
          #message form span {
            display: inline-block;
            text-align: center;
            vertical-align: top;
            background: #039be5;
            text-transform: uppercase;
            text-decoration: none;
            color: white;
            padding: 12px;
            margin-bottom: 0.5em;
            border-radius: 4px;
          }
          #message a, #message button {
            display: inline-block;
            text-align: center;
            background: #039be5;
            text-decoration: none;
            color: white;
            padding: 8px;
            margin-bottom: 0.5em;
            border-radius: 4px;
            border: 0;
          }
          #message .block { display: block; margin-top: 1em; width: 100%; }
          #message, #message a, #message button, #error-message { box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24); }
          #load { color: rgba(0,0,0,0.4); text-align: center; font-size: 13px; }
          @media (max-width: 600px) {
            body, #message { margin-top: 0; background: white; box-shadow: none; }
            body { border-top: 16px solid #ffa100; }
          }
          .center {
            margin: 0;
            position: absolute;
            top: 30%;
            left: 50%;
            -ms-transform: translate(-50%, -50%);
            transform: translate(-50%, -50%);
          }
          .title-bar {
            padding-top: 0;
            padding-bottom: 0;
            position: relative;
          }
          .title-bar-background-image {
            background-size: cover;
            background-position: center center;
            background-image: url(https://friends-invite-33b03.firebaseapp.com/images/20180527_095150.jpg);
            transform: translate3d(0px, 0px, 0px);
            width: 100%;
            height: 100%;
          }
          .title-bar-background-image-overlay {
            background: rgba(0, 0, 0, 0.5);
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            padding-top: 112px;
            padding-bottom: 56px;
          }
          .title-bar-background-image-container {
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            position: absolute;
          }
          .title-bar-text {
            margin-left: 15%;
            margin-right: 15%;
            text-align: center;
            color: #ffffff;
            font-size: 4em;
          }
          .guest-count {
            width: 3em;
          }
        </style>
      </head>
      <body>
        <div class="title-bar title-bar-background-image">
          <div class="title-bar-background-image-overlay">
            <h1 class="center title-bar-text">Celebration</h1>
          </div>
        </div>
        <div id="message">
          <h2>Greetings!</h2>

          <p>Celeblate with me.</p>

          <a class="block" href="https://friends-invite-33b03.firebaseapp.com/index.html?u=${encodeURIComponent(user_id)}">I'm coming.</a>
        </div>
      </body>
    </html>        
`;
}

function getUserLandingPageToken(user_id)
{
    const tokens_ref = db.collection('landing-page-tokens');

    return new Promise((resolve, reject) => {
        if (!user_id)
        {
            reject(new Error(`Empty user_id: ${user_id}`));
            return;
        }
        tokens_ref.where('user_id', '==', user_id).limit(1).get()
            .then(docs => {
                if (docs.empty)
                {
                    // Create a new token.
                    const ref = tokens_ref.doc();

                    return ref.set({ 'user_id': user_id })
                        .then(res => {
                            resolve(ref.id);

                            return res;
                        });
                }
                else
                {
                    docs.forEach(doc => {
                        resolve(doc.id);
                    });

                    return null;
                }
            })
            .catch(err => {
                reject(err);
            });
    });
}

interface ISendInvitationsReplyData extends IFunctionReplyData {
    messages: string[];
    success_recepients: string[];
    fail_recepients: string[];
}

interface ISendInvitationsReply extends IFunctionReply {
    data: ISendInvitationsReplyData;
}

interface ISendInvitationsReplyPartial extends IFunctionReplyPartial {
    data: Partial<ISendInvitationsReplyData>;
}

export function sendInvitations(request, response): void | Promise<string | void> {
    const res: ISendInvitationsReplyPartial = { 'data': {'success': false} };

    if (!request.body || !request.body.data || !request.body.data.secret)
    {
        res.data.message = 'No secret specified!';
        response.status(500).send(res);
        return;
    }
    if (request.body.data.secret !== functions.config().send_invitations_secret)
    {
        res.data.message = 'Invalid secret.';
        response.status(400).send(res);
        return;
    }

    function sendToInvitees(invitees)
    {
        const email_promises = [];
        const messages = [];
        let emails_sent = 0;
        const success_recepients = [];
        const fail_recepients = [];

        invitees.forEach(invitee => {
            const to_email = typeof invitee === 'string' ? invitee : invitee.data().email;

            const mail_options: {[key: string]: string} = {
                'from': 'P <p@gmail.com>',
                'to': to_email,
                'subject': "Celebration",
            };

            email_promises.push(
                getUserLandingPageToken(to_email).
                    then(user_id => {
                        mail_options.text = getEmailText(user_id);
                        mail_options.html = getEmailHtml(user_id);

                        return mailTransport.sendMail(mail_options)
                    })
                    .then(() => {
                        ++emails_sent;
                        success_recepients.push(to_email);

                        return to_email;
                    })
                    .catch(err => {
                        messages.push(`E-mailing to ${to_email} failed: ${err}`);
                        fail_recepients.push(to_email);

                        throw err;
                    })
            );
        });

        return Promise.all(email_promises)
            .then(() => {
                res.data.message = `Messages sent: ${emails_sent}`;
                res.data.messages = messages;
                res.data.success_recepients = success_recepients;
                res.data.fail_recepients = fail_recepients;
                response.status(200).send(res as ISendInvitationsReply);

                return res.data.message;
            })
            .catch(err => {
                res.data.message = `Failed to send e-mail: ${err}\nMessages sent: ${emails_sent}`;
                res.data.messages = messages;
                res.data.success_recepients = success_recepients;
                res.data.fail_recepients = fail_recepients;
                response.status(500).send(res as ISendInvitationsReply);
            });
    }

    if (request.body.data.recepients)
    {
        return sendToInvitees(request.body.data.recepients);
    }
    else
    {
        // Send to everyone:
        db.collection('invitees').get()
        .then(invitees => {
            return sendToInvitees(invitees);
        })
        .catch(err => {
            res.data.message = 'Reading invitees failed: ' + err;
            response.status(500).send(res);
        });
    }
}
