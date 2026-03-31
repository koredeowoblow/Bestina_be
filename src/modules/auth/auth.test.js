import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../server.js"; // Assuming app is exported from server.js

describe("Auth Integration Tests", () => {
  let server;

  beforeAll(async () => {
    // Connect to test database if needed
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("POST /api/auth/login", () => {
    it("should return 401 for invalid credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "wrong@example.com",
        password: "password123",
      });
      expect(res.statusCode).toEqual(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should fail without refresh token cookie", async () => {
      const res = await request(app).post("/api/auth/refresh").send({});
      expect(res.statusCode).toEqual(401);
    });
  });
});
