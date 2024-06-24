const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const stripe =require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://fitlab-d40a2.web.app",
    "https://fitlab-d40a2.firebaseapp.com",
  ],
  credentials: true,
}));
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
    // const usersCollection = client.db('FitnessDB').collection('users');
    const allUsersCollection = client.db('FitnessDB').collection('allUsers');
    const classCollection = client.db('FitnessDB').collection('class');
    const slotsCollection = client.db('FitnessDB').collection('slots');
    const forumCollection = client.db('FitnessDB').collection('forum');
    const subscriberCollection = client.db('FitnessDB').collection('subscriber');
    const paymentsCollection = client.db('FitnessDB').collection('payments');
    const reviewCollection = client.db('FitnessDB').collection('reviews');
// jwt related api 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })
 // middlewares 
 const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' })
    }
    console.log(decoded)
    req.decoded = decoded;
    next();
  })
}
const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await allUsersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
    //user related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      //insert email if user doesn't exist
      const query = { email: user.email };
      const existedUser = await allUsersCollection.findOne(query);
      if (existedUser) {
        return res.send({ message: 'user already existed', insertedId: null });
      }
      const result = await allUsersCollection.insertOne(user);
      res.send(result);
    })
    app.get('/subscriber', async (req, res) => {
      const query = { role: 'subscriber' }
      const result = await subscriberCollection.find(query).toArray();
      res.send(result);
    })


    // ####### collection: "forumPost" related api ######



    // ####### collection: "slots" related api ######

    app.get('/trainer/:email', async (req, res) => {
      const userEmail = req.params.email
      const query = { email: userEmail, role: 'Trainer' }
      const result = await allUsersCollection.findOne(query);
      res.send(result);
    })

    app.get('/classItem', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })
    app.post('/AddSlot', async (req, res) => {
      const slotInfo = req.body;
      // const trainerEmail = req.query.trainerEmail;
      // const trainerSlot = req.query.slot;
      // //insert email if user doesn't exist
      // const query = { email: trainerEmail, slotName:trainerSlot};
      // const existedUser = await slotsCollection.findOne(query);
      // if (existedUser) {
      //   return res.send({ message: 'You already existed', insertedId: null });
      // }
      const result = await slotsCollection.insertOne(slotInfo);
      res.send(result);
    })
    app.patch('/updatedTrainerInfo', async (req, res) => {
      const trainerInfo = req.body;
      const classes = req.query.classes;
      // console.log('classes', classes)
      // console.log('trainerInfo', trainerInfo)
      const filter = { className: classes };
      const updatedUser = {
        $push: {
          trainers: trainerInfo
        }
      }
      const result = await classCollection.updateOne(filter, updatedUser);
      res.send(result);
    })

    app.get('/manageSlot', async (req, res) => {
      const trainerEmail = req.query.trainer;
      const query = { email: trainerEmail }
      const result = await slotsCollection.find(query).toArray();
      res.send(result);
    })
    app.delete('/slot/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await slotsCollection.deleteOne(query);
      res.send(result);
    })
    app.get('/cardDetail', async (req, res) => {
      const trainerEmail = req.query.trainer;
      const query = { email: trainerEmail }
      const result = await slotsCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/slotBooking/:id', async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const query = { _id: new ObjectId(id) };
      const result = await slotsCollection.findOne(query);
      res.send(result);
    })
    // payment related 
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
    const amount=parseInt(price * 100);
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card"
        ],
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        // automatic_payment_methods: {
        //   enabled: true,
        // },
      });
    
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    
    // ####### collection: "class" related api ######
    app.post('/addClasses', async (req, res) => {
      const addClass = req.body;
      const adminClass = req.query.adminClass;
      //insert email if user doesn't exist
      const query = { className: adminClass };
      const existedUser = await classCollection.findOne(query);
      if (existedUser) {
        return res.send({ message: 'Class already existed', insertedId: null });
      }
      const result = await classCollection.insertOne(addClass);
      res.send(result);
    })

    app.get('/allClasses', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })
    app.patch('/updatedClass/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          status: 'Removed trainer',
        }
      }
      const result = await allUsersCollection.updateOne(filter, updatedUser);
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


    app.get('/admin',verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log(req.decoded)
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await allUsersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })
    app.get('/activeUser',verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log(req.decoded)
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const result = await allUsersCollection.findOne(query);
      res.send(result);
    })
    app.get('/allTrainer', async (req, res) => {
      const query = { status: 'Confirm' }
      const result = await allUsersCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/trainers', async (req, res) => {
      const query = { role: 'Trainer' }
      const result = await allUsersCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/trainerCard/:email', async (req, res) => {
      const userEmail = req.params.email;
      // console.log(id)
      const query = { email: userEmail };
      const result = await allUsersCollection.findOne(query);
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
          role: updated.role
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
          role: rejectedInfo.role,
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
          status: 'Removed trainer',
          role: 'member',
        }
      }
      const result = await allUsersCollection.updateOne(filter, updatedUser);
      res.send(result);
    })
    app.get('/addPost', async (req, res) => {
      const userEmail = req.query.user;
      const query = { email: userEmail }
      const result = await allUsersCollection.findOne(query);
      res.send(result);
    })
    // ********end admin related api********

    // ******** forumPost related api********
    app.post('/addPost', async (req, res) => {
      const applicant = req.body;
      const result = await forumCollection.insertOne(applicant);
      res.send(result);
    })
    app.get('/forum', async (req, res) => {
      const result = await forumCollection.find().toArray();
      res.send(result);
    })
    app.get('/recentPosts', async (req, res) => {
      const result = await forumCollection.find().sort({ postTime: 1 }).toArray();
      res.send(result);
    })
    app.get('/featureClasses', async (req, res) => {
      const result = await classCollection.find().sort({ count: -1 }).toArray();
      res.send(result);
    })
    // ************newsletter api ***************

    app.post('/newsletter', async (req, res) => {
      const applicant = req.body;
      const result = await subscriberCollection.insertOne(applicant);
      res.send(result);
    })
    // ************review related api ***************

    app.post('/reviews', async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    })
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().sort({ reviewDate: -1 }).toArray();
      res.send(result);
    })
    // ************member api ***************
    app.get('/member', async (req, res) => {
      const userEmail = req.query.email;
      // console.log(id)
      const query = { email: userEmail };
      const result = await allUsersCollection.findOne(query);
      res.send(result);
    })
    app.get('/activity', async (req, res) => {
      const query = {
        $or: [
          { status: "rejected" },
          { status: "Pending" }
        ]
      }
      const result = await allUsersCollection.find(query).toArray();
      res.send(result);
    })
    app.put('/updateProfile/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updated = req.body;
      const updatedUser = {
        $set: {
          name: updated.name,
          photo: updated.photo
        }
      }
      const result = await allUsersCollection.updateOne(filter, updatedUser, options);
      res.send(result);
    })
    app.get('/bookedTrainers', async (req, res) => {
      const userEmail = req.query.email;
      // console.log(id)
      const query = { email: userEmail };
      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    })
//Payment related api
app.post('/payments', async (req, res) => {
  const payment = req.body;
  const paymentResult = await paymentsCollection.insertOne(payment);
  
  // update booking count in class collection
  const update = {
    $inc: { count: 1 },
  }
  const query = { className: payment.uniqueClass }
  const updateCount = await classCollection.updateOne(query, update)
  console.log(updateCount)
  res.send(paymentResult);
})
app.get('/payments/:email', verifyToken, async (req, res) => {
  const query = { email: req.params.email }
  if (req.params.email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  const paymentResult = await paymentsCollection.find(query).toArray();
  res.send(paymentResult);
})
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