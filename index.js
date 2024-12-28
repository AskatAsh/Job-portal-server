require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId, MaxKey } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://jobhub-79a5f.web.app", "https://jobhub-79a5f.firebaseapp.com"],
    credentials: true,
  })
);

const logger = (req, res, next) => {
  console.log("inside the logger...");
  next();
};

const verifyToken = (req, res, next) => {
  // const email = req.query.email;
  const token = req?.cookies?.jwtToken;
  if (!token) {
    return res.status(401).send({ message: "UnAuthorized Access." });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "UnAuthorized Access" });
    }
    req.user = decoded;
    next();
  });
};
// mongoDB database connection code

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fisbs9h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // database collections
    const jobsCollection = client.db("jobPortal").collection("jobs");
    const jobApplicationCollection = client
      .db("jobPortal")
      .collection("job_applications");
    // ==========X=========

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    // auth related api's
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.cookie("jwtToken", token, cookieOptions).send({ success: true });
    });

    app.post("/logout", (req, res) => {
      // console.log("User Logged Out");
      res
        .clearCookie("jwtToken", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });
    // ==========X=========

    // jobs related api's ====================================

    // get all jobs data and posted jobs data with email
    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      const limit = parseInt(req.query.limit) || 0;
      const sortBy = req.query.sortBy;
      console.log(sortBy);
      let sortQuery = {};
      if(sortBy === "low2high"){
        sortQuery = {"salaryRange.min": 1};
      }else if(sortBy === "high2low"){
        sortQuery = {"salaryRange.min": -1};
      }else{
        sortQuery = {};
      }
      
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      
      const result = (await jobsCollection.find(query).sort(sortQuery).limit(limit).toArray());
      res.send(result);
    });

    // get job details
    app.get("/jobDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // ===========================X============================

    // job application api's ==================================

    // apply to a job
    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);

      // the codes below counts applicant count applied in a job
      const query = { _id: new ObjectId(application.job_id) };
      const job = await jobsCollection.findOne(query);
      let newCount = 0;
      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      } else {
        newCount = 1;
      }
      const updateCount = {
        $set: {
          applicationCount: newCount,
        },
      };
      const updateResult = await jobsCollection.updateOne(query, updateCount);
      // ==========================X=============================

      res.send(result);
    });

    // get applied jobs of a user
    app.get("/job-applications", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };

      if (req.user?.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const result = await jobApplicationCollection.find(query).toArray();

      // alternative way to aggregate data
      for (const application of result) {
        const jobQuery = { _id: new ObjectId(application.job_id) };
        const job = await jobsCollection.findOne(jobQuery);
        if (job) {
          application.title = job.title;
          application.company_logo = job.company_logo;
          application.company = job.company;
          application.status = job.status;
          application.location = job.location;
          application.deadline = job.applicationDeadline;
        }
      }

      res.send(result);
    });

    // get applicants of a job
    app.get("/job-applications/jobs/:job_id", async (req, res) => {
      const id = req.params.job_id;
      const query = { job_id: id };
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    });

    // applicaions status update
    app.patch("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: {
          status: data.status,
        },
      };
      const result = await jobApplicationCollection.updateOne(
        filter,
        updateStatus
      );
      res.send(result);
    });

    // ===========================X============================

    // job posting api's ======================================

    app.post("/jobs", async (req, res) => {
      const jobData = req.body;
      const result = await jobsCollection.insertOne(jobData);
      res.send(result);
    });

    // ===========================X============================

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// ==============x=================

app.get("/", (req, res) => {
  res.send("Job Portal Server is Running...");
});

app.listen(port, () => {
  console.log("Server is running at port: ", port);
});
