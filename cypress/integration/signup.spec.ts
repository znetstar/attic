import {Chance} from 'chance';
import fetch from 'node-fetch';
import {IFormalAccessToken, TokenTypes} from "@znetstar/attic-common/lib/IAccessToken";
import {IUser as AtticUser} from "@znetstar/attic-common";

const chance = new Chance();

describe(
  'Signup', () => {
    describe('Form', () => {
      let form: { username: string, password: string };
      beforeEach(() => {
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


        cy.get('.login-panel-buttons [provider="Email"] > button').click();
        cy.get('#username').type(form.username);
        cy.get('#password').type(form.password);
        cy.get('[type="submit"]').click();

        cy.url().then((u) => {
          assert.equal(u, Cypress.env('SITE_URI')+'/');
        });
      });
    });
  }
)
