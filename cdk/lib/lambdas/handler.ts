// lambda/index.js
import * as AWS from "aws-sdk";
import { Client } from "pg";

exports.handler = async function (event: any, context: any) {
  const secretsManager = new AWS.SecretsManager();
  console.log("Event:", event);
  const secretName = process.env.SECRET_ARN ?? "";
  console.log(secretName);

  try {
    const data = await secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();
    console.log("Secret:", data.SecretString);
    const secret = JSON.parse(data.SecretString ?? "");
    console.log("Secret: ", secret);
    const client = new Client({
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
    });
    console.log("client: ", client);
    console.log(
      secret.host,
      secret.port,
      secret.dbname,
      secret.username,
      secret.password
    );

    await client.connect();

    console.log("connected to pg client: ");

    // Run your queries here, for example:
    const res = await client.query("SELECT NOW()");
    console.log(res.rows[0].now);

    await client.end();
    console.log("Secret: ", secret);

    console.log("Result: ", res);
  } catch (err) {
    console.error("Error retrieving secret:", err);
  }
};
