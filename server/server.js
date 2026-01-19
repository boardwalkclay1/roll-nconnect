const express = require("express");
const cors = require("cors");
require("dotenv").config();

const spotsRoutes = require("./routes/spots");
const trailsRoutes = require("./routes/trails");
const reviewsRoutes = require("./routes/reviews");
const checkinsRoutes = require("./routes/checkins");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "rollnconnect-backend" });
});

app.use("/api/spots", spotsRoutes);
app.use("/api/trails", trailsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/checkins", checkinsRoutes);

app.listen(PORT, () => console.log("Backend running on port", PORT));
