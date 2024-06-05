const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b9hcdyj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const usersCollection = client.db('FitnessDB').collection('users');
    const allUsersCollection = client.db('FitnessDB').collection('allUsers');
    const classCollection = client.db('FitnessDB').collection('class');
    const slotsCollection = client.db('FitnessDB').collection('slots');


    //user related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      //insert email if user doesn't exist
      const query = { email: user.email };
      const existedUser = await usersCollection.findOne(query);
      if (existedUser) {
        return res.send({ message: 'user already existed', insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })
    app.get('/subscriber', async (req, res) => {
      const query = { roll: 'subscriber' }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    })

   

    // ####### collection: "class" related api ######
    app.post('/addClasses', async (req, res) => {
      const addClass = req.body;
      const result = await classCollection.insertOne(addClass);
      res.send(result);
    })

    app.get('/allClasses', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    // ####### collection: "allUsers" related api ######

    // ********start admin related api******** 
    app.post('/appliedTrainer', async (req, res) => {
      const applicant = req.body;
      const result = await allUsersCollection.insertOne(applicant);
      res.send(result);
    })

    
    app.get('/appliedTrainer', async (req, res) => {
      const query = { status: 'Pending' }
      const result = await allUsersCollection.find(query).toArray();
      res.send(result);
    })
    

    app.get('/allTrainer', async (req, res) => {
      const query = { status: 'Confirm' }
      const result = await allUsersCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/trainers', async (req, res) => {
      const query = { roll: 'Trainer' }
      const result = await allUsersCollection.find(query).toArray();
      res.send(result);
    })
    
    // for add slot section 
    app.get('/trainer/:email', async (req, res) => {
      const userEmail= req.params.email
      const query = { email: userEmail, roll: 'Trainer' }
      const result = await allUsersCollection.findOne(query);
      res.send(result);
    })
     // for add slot section 
    app.get('/classItem', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })
    app.put('/confirm/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updated = req.body;
      const updatedUser = {
        $set: {
          status: updated.status,
          roll: updated.roll
        }
      }
      const result = await allUsersCollection.updateOne(filter, updatedUser, options);
      res.send(result);
    })
    app.put('/reject/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const rejectedInfo = req.body;
      const updatedUser = {
        $set: {
          status: rejectedInfo.status,
          roll: rejectedInfo.roll,
          feedback: rejectedInfo.feedback
        }
      }
      const result = await allUsersCollection.updateOne(filter, updatedUser, options);
      res.send(result);
    })
    app.patch('/removeTrainer/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          status:'Removed trainer',
          roll: 'member',
        }
      }
      const result = await allUsersCollection.updateOne(filter, updatedUser);
      res.send(result);
    })
    // ********end admin related api********

      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Fitlab is running.');
})
app.listen(port, () => {
  console.log('FitLab is running on port:', port);
})