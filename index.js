require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
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
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobsCollection = client.db("jobPortal").collection("jobs");


    // jobs related api's
    app.get('/jobs', async (req, res) => {
        const cursor = jobsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    // get job details
    app.get('/jobDetails/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await jobsCollection.findOne(query);
        res.send(result);
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// ==============x=================

app.get('/', (req, res) => {
    res.send("Job Portal Server is Running...");
})

app.listen(port, () => {
    console.log("Server is running at port: ", port);
})