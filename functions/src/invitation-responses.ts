import {db, IFunctionReply, IFunctionReplyPartial} from './admin';


export function submitResponses(request, response) {
    response.set('Access-Control-Allow-Origin', 'https://friends-invite-33b03.firebaseapp.com');
    response.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    response.set('Access-Control-Allow-Methods', 'GET, POST');

    if (request.method === 'OPTIONS')
    {
        response.status(200).send('OK');
        return;
    }

    // Find a user ID for the token passed in:
    const res: IFunctionReplyPartial = { 'data': {} };
    const landing_page_token = request.body.data.u;

    if (!landing_page_token)
    {
        res.data.message = 'Invalid landing page token: ' + landing_page_token;
        response.status(422).send(res as IFunctionReply);
        return;
    }
    db.collection('landing-page-tokens').doc(landing_page_token).get()
        .then(landing_page_token_info => {
            if (!landing_page_token_info.exists)
            {
                res.data.message = 'Landing page token not found: ' + landing_page_token;
                response.status(404).send(res as IFunctionReply);
                throw new Error(res.data.message);
            }

            const user_id = landing_page_token_info.data().user_id;
            const events_ref = db.collection('events');
            let update_cnt = 0;
            const request_events = request.body.data.events;
            const set_promises = [];

            for (const event_id in request_events)
            {
                if (!request_events.hasOwnProperty(event_id))
                {
                    continue;
                }

                const data = {'invitees': {}};

                data['invitees'][user_id] = { 'party_size': request_events[event_id].party_size };
                set_promises.push(
                    events_ref.doc(event_id).set(data, { merge: true })
                        .then(arg => {
                            ++update_cnt;

                            return arg;
                        })
                );
            }

            return Promise.all(set_promises)
                .then(function(results) {
                    res.data.message = 'Updates: ' + update_cnt;

                    return results;
                });
        })
        .then(() => {
            response.status(200).send(res as IFunctionReply);
            return res.data.message;
        })
        .catch(err => {
            res.data.message = 'Reading landing page token failed: ' + err;
            response.status(500).send(res as IFunctionReply);
        });
}

export function loadResponses(request, response) {
    // Handle origin OPTIONS requests:
    response.set('Access-Control-Allow-Origin', 'https://friends-invite-33b03.firebaseapp.com');
    response.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    response.set('Access-Control-Allow-Methods', 'GET, POST');

    if (request.method === 'OPTIONS')
    {
        response.status(200).send('OK');
        return;
    }

    // Handle GET, POST, etc. requests:
    const res: IFunctionReplyPartial = { 'data': { 'success': false } };

    // Find a user ID for the token passed in:
    const landing_page_token = request.body.data.u;

    if (!landing_page_token)
    {
        res.data.message = 'Invalid landing page token: ' + landing_page_token;
        response.status(422).send(res as IFunctionReply);
        return;
    }
    db.collection('landing-page-tokens').doc(landing_page_token).get()
        .catch(err => {
            res.data.message = 'Reading landing page token failed: ' + err;
            response.status(500).send(res);
        })
        .then(landing_page_token_info => {
            if (!landing_page_token_info || !landing_page_token_info.exists)
            {
                res.data.message = 'Landing page token not found: ' + landing_page_token;
                response.status(404).send(res);
                throw new Error(res.data.message);
            }

            const user_id = landing_page_token_info.data().user_id;

            return Promise.all([
                user_id,
                db.collection('events').get()
                    .catch(err => {
                        res.data.message = 'Error reading events list: ' + err;
                        response.status(500).send(res);        
                    })
            ]);
        })
        .then(args => {
            const user_id = args[0];
            const events_list = args[1];
            const responses = {};

            if (!events_list) {
                res.data.message = 'No events found!';
            }
            else
            {
                events_list.forEach(event_info => {
                    const invitees = event_info.data().invitees;
    
                    if (invitees)
                    {
                        const invitee_info = invitees[user_id];
    
                        if (invitee_info)
                        {
                            responses[event_info.id] = { 'party_size': invitee_info['party_size'] };
                        }
                    }
                });    
                res.data.message = 'OK';
            }

            res.data['events'] = responses;
            res.data.success = true;
            response.status(200).send(res);

            return res.data.message;
        })
        .catch(err => {
            res.data.message = `Error: ${err}`;

            response.status(500).send(res);
        });
}
