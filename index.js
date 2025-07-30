import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // ✅ Import CORS
import userRoutes from './src/routes/userroute.js';
import swaggerUi from "swagger-ui-express";
import swaggerSpec from './src/swagger/swaggerSpec.js';
import blogRoutes from "./src/routes/blogRoutes.js"

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// ✅ Enable CORS for all origins (for development)
app.use(cors());

// Optional: Restrict to only your frontend origin
// app.use(cors({
//   origin: 'http://localhost:3000'
// }));

// ✅ Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Routes
app.use('/api', userRoutes);
app.use(blogRoutes);

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
});
