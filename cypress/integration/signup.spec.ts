import {Chance} from 'chance';
import {atticServiceRpcProxy, IRPC} from "../common";

const chance = new Chance();

describe(
  'Signup', () => {
    describe('Form', () => {
      let form: { username: string, password: string };
      let rpcInvoke: (prop: string, ...args: any[]) => Promise<any>;

      before(async () => {
        rpcInvoke =  await atticServiceRpcProxy();

        // Clear the DB
        await rpcInvoke('marketplaceDbClear');
      });

      beforeEach(async () => {
        form = {
          username: chance.email(),
          password: chance.string()
        };

      });

      it('Should create a new account with the provided credentials, and then login',   () => {
        // Signup
        cy.visit(Cypress.env('SITE_URI')+'/signup');
        cy.get('#username').type(form.username);
        cy.get('#password').type(form.password);
        cy.get('[type="submit"]').click();

        // @ts-ignore
        cy.wait(5e3).then(() => {
          (async () => {
            // The user should exist in the database
            const dbUsers = await rpcInvoke('marketplaceDbFind', 'users', { email: form.username });
            assert.ok(dbUsers);
            const dbUser = dbUsers[0] as { email: string };
            assert.ok(dbUser);
            assert.equal(dbUser.email, form.username);

            // Should be able to sign in as the user
            const token = await rpcInvoke('getAccessToken', {
              username: form.username,
              password: form.password,
              grant_type: 'password',
              client_id: Cypress.env('ATTIC_LOCAL_CLIENT_ID'),
              client_secret: Cypress.env('ATTIC_LOCAL_CLIENT_SECRET'),
              redirect_uri: Cypress.env('ATTIC_LOCAL_REDIRECT_URI'),
              scope: 'rpc.getSelfUser'
            });

            assert.ok(token);
            assert.ok(token.access_token);

            // Should be able to retrieve the Attic user with the token
            const rpcResp = await fetch(
              Cypress.env('ATTIC_URI')+'/rpc',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token.access_token}`
                },
                body: JSON.stringify({
                  method: 'getSelfUser',
                  params: [],
                  jsonrpc: '2.0',
                  id: (new Date()).getTime()
                })
              }
            );

            assert.equal(rpcResp.status, 200);
            assert.equal(rpcResp.headers.get('content-type'), 'application/json');

            // Username on the db user should be the same as the attic user
            const userResp = await rpcResp.json();
            assert.ok(userResp);
            assert.ok(userResp.result);
            assert.equal(userResp.result.username, dbUser.email);
            assert.equal(userResp.result._id, dbUser.atticUserId);
          })()
        })
      });

      it('should prevent signups with existing emails', () => {
        for (let i = 0; i < 2; i++) {
          // Signup
          cy.visit(Cypress.env('SITE_URI') + '/signup');
          cy.get('#username').type(form.username);
          cy.get('#password').type(form.password);
          cy.get('[type="submit"]').click();
        }
        cy.contains('already exists')
      });
    });
  }
)
