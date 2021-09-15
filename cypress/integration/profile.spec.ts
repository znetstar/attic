import {Chance} from 'chance';
import {atticServiceRpcProxy, IRPC} from "../common";
import {Buffer} from 'buffer'

const chance = new Chance();

describe(
  'Profile', () => {
    describe('Form', () => {
      let form: {
        username: string,
        password: string,
        firstName: string,
        lastName: string,
        middleName?: string,
        image: Buffer
      };
      let rpcInvoke: (prop: string, ...args: any[]) => Promise<any>;

      before(async () => {
        rpcInvoke = await atticServiceRpcProxy();

        // Clear the DB
        await rpcInvoke('marketplaceDbClear');
      });

      beforeEach(async () => {
        const emp = await rpcInvoke('marketplaceRandomProfile');
        form = {
          username: chance.email(),
          password: chance.string(),
          firstName: emp.name,
          lastName: chance.last(),
          middleName: chance.bool() ? chance.first() : void (0),
          image: Buffer.from(emp.image, 'base64')
        };

      });

      it('Values on the profile page should match those in the db', async () => {
        cy.visit(Cypress.env('SITE_URI')+'/signup');
        cy.get('#username').type(form.username);
        cy.get('#password').type(form.password);
        cy.get('[type="submit"]').click();

        cy.wait(5e3).then(() => {
          cy.visit(Cypress.env('SITE_URI') + '/login');
          cy.get('[provider="Email"] button').click();
          cy.get('#username').type(form.username);
          cy.get('#password').type(form.password);
          cy.get('[type="submit"]').click();

          // @ts-ignore
          cy.wait(5e3).then(() => {
            (async () => {
              const dbUsers = await rpcInvoke('marketplaceDbFind', 'users', {email: form.username});
              assert.ok(dbUsers);
              const dbUser = dbUsers[0] as any;

              cy.visit(Cypress.env('SITE_URI') + '/profile');
              cy.get('[name="email"]').invoke('val').then((formEmail)=>{
                assert.equal(formEmail, dbUser.email);
              })
            })();
          });
        });
      });
      it('Values on the profile page should be changeable', async () => {
        cy.visit(Cypress.env('SITE_URI')+'/signup');
        cy.get('#username').type(form.username);
        cy.get('#password').type(form.password);
        cy.get('[type="submit"]').click();

        cy.wait(5e3).then(() => {
          cy.visit(Cypress.env('SITE_URI') + '/login');
          cy.get('[provider="Email"] button').click();
          cy.get('#username').type(form.username);
          cy.get('#password').type(form.password);
          cy.get('[type="submit"]').click();

          // @ts-ignore
          cy.wait(5e3).then(() => {
            cy.visit(Cypress.env('SITE_URI') + '/profile');
            cy.get('[name="first-name"]').type(form.firstName);
            cy.get('[name="last-name"]').type(form.lastName);
            if (form.middleName) {
              cy.get('[name="middle-name"]').type(form.middleName);
            }
            cy.get('input[type="file"]').attachFile({
              fileContent: new Blob([form.image]),
              fileName: 'profile.jpeg',
              mimeType: 'image/jpeg'
            });

            cy.wait(5e3).then(() => {
              cy.get('[type="submit"]').click();

              // @ts-ignore
              cy.wait(5e3).then(() => {
                (async () => {
                  const dbUsers = await rpcInvoke('marketplaceDbFind', 'users', {email: form.username});
                  assert.ok(dbUsers);
                  const dbUser = dbUsers[0] as any;
                  assert.equal(dbUser.firstName, form.firstName);
                  assert.equal(dbUser.lastName, form.lastName);
                  assert.equal(dbUser.middleName, form.middleName);
                  assert.ok(dbUser.image);
                })();
              });
            });
          });
        });
      });
    });
  }
)
