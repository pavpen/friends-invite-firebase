// The Firebase Admin SDK to access the Firebase Realtime Database.
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

export const db = admin.firestore();

export interface IFunctionReplyData {
    success: boolean;
    message: string;
}

export interface IFunctionReply {
    data: IFunctionReplyData;
}

export interface IFunctionReplyPartial {
    data: Partial<IFunctionReplyData>
}