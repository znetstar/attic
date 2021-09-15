import fetch from 'cross-fetch';

export type IRPC = {
  marketplaceDbFind(collection: string, query: any): Promise<any[]>;
  marketplaceDbClear(): Promise<void>;
  getAccessToken(form: any): Promise<any>;
};


let token: any;
let noLoop = false;


export async function createUser(email: string, password: string) {
  const resp = await fetch(Cypress.env('SITE_URI')+'/api/rpc', {
    headers:  {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      method: 'marketplace:createUser',
      params: [
        {
          email, password
        }
      ],
      jsonrpc: '2.0',
      id: (new Date()).getTime()
    })
  });

  if (resp.status !== 200) {
    throw new Error(`HTTP Code ${resp.status}`);
  }

  const respBody = await resp.json();

  if (respBody.error) {
    throw new Error(respBody.error.data?.message || respBody.error.innerError?.message || respBody.error.message || respBody.error);
  } else {
    return respBody.result;
  }
}

/**
 * Creates an Attic RPC client with superuser permissions
 */
export async function atticServiceRpcProxy() {
  async function ensureToken() {
    const tokenBody = await fetch(Cypress.env('ATTIC_URI')+'/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'no-cors',
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: Cypress.env('SERVICE_CLIENT_ID'),
        client_secret: Cypress.env('SERVICE_CLIENT_SECRET'),
        redirect_uri: Cypress.env('SERVICE_REDIRECT_URI'),
        username: Cypress.env('SERVICE_USERNAME'),
        scope: '.*'
      })
    });

    if (tokenBody.status !== 200) {
      throw new Error(`HTTP Error ${tokenBody.status}`);
    }
    noLoop = false;

    token = await tokenBody.json();
  }
  if (!token)  {
    await ensureToken();
  }

  async function invokeInner (prop: string, ...args: any[]): Promise<any> {
    const resp = await fetch(Cypress.env('ATTIC_URI')+'/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token.access_token
      },
      // @ts-ignore
      mode: 'no-cors',
      body: JSON.stringify({
        method: prop,
        params: args,
        jsonrpc: '2.0',
        id: (new Date()).getTime()
      })
    });

    if (resp.status === 401) {
      await ensureToken();

      noLoop = true;
      return invokeInner(prop, ...args);
    }

    if (resp.status !== 200) {
      throw new Error(`HTTP Code ${resp.status}`);
    }

    const respBody = await resp.json();
    if (respBody.error) {
      throw new Error(respBody.error.data?.message || respBody.error.innerError?.message || respBody.error.message || respBody.error);
    } else {
      return respBody.result;
    }
  }
  return invokeInner;
}
