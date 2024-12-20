require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());
app.use(cors());

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

    const jobsCollection = client.db("jobPortal").collection("jobs");
    const jobApplicationCollection = client
      .db("jobPortal")
      .collection("job_applications");

    // jobs related api's ====================================

    // get all jobs data
    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
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
    app.get("/job-applications", async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
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
      const filter = {_id: new ObjectId(id)};
      const updateStatus = {
        $set: {
          status: data.status
        }
      }
      const result = await jobApplicationCollection.updateOne(filter, updateStatus);
      res.send(result);
    })

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
