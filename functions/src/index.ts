import * as functions from 'firebase-functions';
import * as invitation_responses from './invitation-responses';
import * as invitation_sending from './invitation-sending';

export const submitResponses = functions.https.onRequest(invitation_responses.submitResponses);

export const loadResponses = functions.https.onRequest(invitation_responses.loadResponses);
export const sendInvitations = functions.https.onRequest(invitation_sending.sendInvitations);
