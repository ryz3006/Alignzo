import express from "express";
import cors from "cors";
import userRoutes from "./routes/users.js";
import projectRoutes from "./routes/projects.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import { SERVER_PORT } from "./config.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/admin", adminAuthRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(SERVER_PORT, () => console.log(`Backend running on port ${SERVER_PORT}`)); 