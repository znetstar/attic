# Attic Server REST

`attic-server-rest` exposes a REST API for `attic-server`.
 The syntax is generally `/rest/:modelName` for `GET`, `HEAD` and `POST`, and `/rest/:modelName/:id` for `GET`, `HEAD`, `PUT`, `PATCH` and `DELETE`.

Below is a comparison of the REST syntax to the RPC syntax. The example uses the `User` model but this can be replaced with a `User` model
any other model, for example, the `Client` or `AccessToken` models.

| RPC Syntax  | REST Syntax            |
| ----------- | ---------------------- |
| findUsers   | GET: /rest/User        |
| findUser    | GET: /rest/User/:id    |
| getSelfUser | GET: /rest/User/self   |
| createUser  | POST: /rest/User       |
| updateUser  | PUT: /rest/User/:id    |
| deleteUser  | DELETE: /rest/User/:id |
