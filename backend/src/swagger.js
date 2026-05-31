// Swagger UI setup
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./openapi");

function setupSwagger(app) {
  const swaggerOptions = {
    customSiteTitle: "TaxEase API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  };

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, swaggerOptions));
  app.get("/api-docs.json", (_, res) => res.json(openapiSpec));
}

module.exports = { setupSwagger };
