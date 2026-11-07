const { NestFactory } = require("@nestjs/core");
const { ValidationPipe } = require("@nestjs/common");
const { getConnectionToken } = require("@nestjs/mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

async function main() {
  process.env.CORS_ORIGIN = "http://localhost:3847";
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();

  const { AppModule } = require("../dist/app.module.js");
  const { HttpExceptionFilter } = require("../dist/common/http-exception.filter.js");

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  const server = app.getHttpServer();
  const connection = app.get(getConnectionToken());

  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const peopleInsert = await connection.collection("people").insertOne({
    name: "Integration Author",
    seedKey: "person:integration",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const personId = String(peopleInsert.insertedId);

  let res = await request(server).get("/api/people");
  assert(res.status === 200, "people 200");

  res = await request(server).post("/api/sites").send({
    address: "Integration.ZZ",
    authorId: personId,
    html: '<h1>Kelp Signal</h1><script>alert(1)</script><p>unique integration phrase</p><a href="javascript:alert(1)">x</a><a href="forest.zz">f</a>',
  });
  assert(
    res.status === 201,
    `create site ${res.status} ${JSON.stringify(res.body)}`,
  );
  assert(res.body.address === "integration.zz", "normalized address");
  assert(!String(res.body.html).includes("<script"), "script stripped");
  assert(
    String(res.body.html).includes('data-sw-nav="forest.zz"'),
    "internal link rewritten",
  );

  res = await request(server).post("/api/sites").send({
    address: "integration.zz",
    authorId: personId,
    html: "<h1>dup</h1>",
  });
  assert(res.status === 409, "duplicate rejected");

  res = await request(server).get("/api/sites/missing.zz");
  assert(res.status === 404, "missing 404");

  res = await request(server)
    .get("/api/search")
    .query({ q: "INTEGRATION PHRASE" });
  assert(res.status === 200 && res.body.length > 0, "search finds body text");

  res = await request(server).post("/api/visits").send({
    personId,
    address: "integration.zz",
    navigationType: "address-bar",
  });
  assert(res.status === 201 && res.body.status === "success", "visit success");

  res = await request(server).post("/api/visits").send({
    personId,
    address: "nowhere.zz",
    navigationType: "link",
  });
  assert(
    res.status === 201 && res.body.status === "not-found",
    "visit not-found",
  );

  res = await request(server).get("/api/visits").query({ personId });
  assert(res.status === 200 && res.body.length >= 2, "visit list");

  console.log("integration checks passed");
  await app.close();
  await mongo.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
