import { describe, expect, it } from "vitest";
import { getTiDbConnectionOptions } from "./db";

describe("TiDB database connection options", () => {
  it("parses a MySQL URL and always enables certificate verification", () => {
    const options = getTiDbConnectionOptions(
      "mysql://ehode_user:secret@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/ehode",
    );

    expect(options).toMatchObject({
      host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
      port: 4000,
      user: "ehode_user",
      password: "secret",
      database: "ehode",
      ssl: { rejectUnauthorized: true },
    });
  });

  it("rejects URLs without an application database", () => {
    expect(() => getTiDbConnectionOptions("mysql://user:secret@db.example.com")).toThrow(
      "DATABASE_URL must include a database name",
    );
  });
});
