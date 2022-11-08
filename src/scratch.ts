// spec
//   .addTitle("Tracktile API")
//   .addDescription(
//     `# Introduction
// This API allows programmatic access to all aspects of the [Tracktile](https://tracktile.io) platform.
// This API is intended to provide a means to integrate with our platform and hopefully allow you to do incredible things.

// ## Early Access

// The Tracktile API is currently in an early access phase while we work closely with our early access users to ensure we are building the best
// platform possible.

// If you are interested in joining our early access group, please reach out to [hello@tracktile.io](mailto:hello@tracktile.io).

// ## OpenAPI Specification
// This API is documented in **OpenAPI format** with the intent to make using the API as simple as possible. In addition to
// this documentation you may use our OpenAPI Specification with a [number of tools](https://openapi.tools/).

// The specification is available in both [YAML](https://docs.tracktile.io/tracktile.openapi.yaml) and [JSON](https://docs.tracktile.io/tracktile.openapi.json) formats.

// ## Cross-Origin Resource Sharing
// This API features Cross-Origin Resource Sharing (CORS) implemented in compliance with  [W3C spec](https://www.w3.org/TR/cors/).
// And that allows cross-domain communication from the browser.
// All responses have a wildcard same-origin which makes them completely public and accessible to everyone.

// # Authentication

// Tracktile API offers two forms of authentication:
// 	- Personal Access Token
// 	- Username and password

// <SecurityDefinitions />`
//   )
//   .addVersion(pkg.version)
//   .addLicense({
//     name: "Private",
//     url: "https://tracktile.io/",
//   })
//   .addContact({
//     name: "Tracktile",
//     email: "contact@tracktile.io",
//     url: "http://tracktile.io",
//   })
//   .addServer({ url: "https://api.tracktile.io", description: "Production" })
//   .addServer({
//     url: "https://development-api.tracktile.io",
//     description: "Development",
//   })
//   .addSecurityScheme("JWT", {
//     bearerFormat: "JWT",
//     type: "http",
//     scheme: "bearer",
//     description:
//       "The JWT received by authenticating to the /auth/login endpoint.",
//   })
//   .addResponse("400", {
//     description: "Bad Request Error",
//     content: {
//       "application/json": {
//         schema: {
//           properties: {
//             status: { type: "number" },
//             message: { type: "string" },
//           },
//           example: {
//             status: 400,
//             message:
//               "A helpful error message indicating what was invalid about your request",
//           },
//         },
//       },
//     },
//   })
//   .addResponse("401", {
//     description: "Unauthorized",
//     content: {
//       "application/json": {
//         schema: {
//           properties: {
//             status: { type: "number" },
//             message: { type: "string" },
//           },
//           example: {
//             status: 401,
//             message: "You must be authenticated to access this resource.",
//           },
//         },
//       },
//     },
//   })
//   .addResponse("403", {
//     description: "Forbidden",
//     content: {
//       "application/json": {
//         schema: {
//           properties: {
//             status: { type: "number" },
//             message: { type: "string" },
//           },
//           example: {
//             status: 403,
//             message:
//               "Current user does not have permissions to access this resource.",
//           },
//         },
//       },
//     },
//   })
//   .addResponse("500", {
//     description: "Internal Server Error",
//     content: {
//       "application/json": {
//         schema: {
//           properties: {
//             status: { type: "number" },
//             message: { type: "string" },
//           },
//           example: {
//             status: 500,
//             message: "Something has gone horribly wrong.",
//           },
//         },
//       },
//     },
//   });
