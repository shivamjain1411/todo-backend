const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const app = express();
const port = 3000;
const cors = require("cors");
const moment = require("moment");
app.use(
  cors({
    origin: "*",
  })
);
// app.use(bodyParser.urlencoded({ urlencoded: false }));
app.use(bodyParser.json());

mongoose
  .connect(
    "mongodb+srv://jainshivam312:IVceBnUvd6P87kym@cluster0.4nl0u.mongodb.net/nativ-Todo"
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB", error);
  });

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

const User = require("./models/user");
const Todo = require("./models/todo");

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    //check if email is already registered
    console.log(req.body, "here is body");
    console.log(123);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.log("error registering user");
    res.status(500).json({ error: err.message });
  }
});
const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString("hex");
  return secretKey;
};
const secretKey = generateSecretKey();
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.password !== password) {
      res.status(404).json({ error: "invalid Password" });
    }
    const token = jwt.sign({ userId: user._id }, secretKey);
    res.status(200).json(token);
  } catch (err) {
    console.log("error logging in user");
    res.status(500).json({ error: err.message });
  }
});

app.post("/todos/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { title, category } = req.body;

    const newTodo = new Todo({
      title,
      category,
      dueDate: moment().format("YYYY-MM-DD"),
    });

    await newTodo.save();
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: err.message, message: "User not found" });
    } else {
      user?.todos.push(newTodo._id);
      await user.save();

      res
        .status(201)
        .json({ message: "Todo added successfully", todo: newTodo });
    }
  } catch (err) {
    res.status(500).json({ error: err.message, message: "todo not added" });
  }
});

app.get("/users/:userId/todos", async (req, res) => {
  try {
    console.log(123);
    const userId = req.params.userId;
    const user = await User.findById(userId).populate("todos");
    if (!user) {
      res.status(404).json({ error: err.message, message: "User not found" });
    }
    res.status(200).json({ todos: user.todos });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error fetching todos" });
  }
});

app.patch("/todos/:todoId/complete", async (req, res) => {
  try {
    const todoId = req.params.todoId;
    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      {
        status: "completed",
      },
      { new: true }
    );
    if (!updatedTodo) {
      res.status(404).json({ error: err.message, message: "Todo not found" });
    }
    res
      .status(200)
      .json({ message: "Todo completed successfully", todo: updatedTodo });
  } catch (err) {
    res
      .status(500)
      .json({ error: err.message, message: "Error completing todo" });
  }
});

app.patch("/todos/:todoId/unComplete", async (req, res) => {
  try {
    const todoId = req.params.todoId;
    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      {
        status: "pending",
      },
      { new: true }
    );
    if (!updatedTodo) {
      res.status(404).json({ error: err.message, message: "Todo not found" });
    }
    res.status(200).json({
      message: "Todo status unpending successfully",
      todo: updatedTodo,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: err.message, message: "Error status updating todo" });
  }
});

app.get("/todos/completed/:date", async (req, res) => {
  try {
    const date = req.params.date;

    const completedTodos = await Todo.find({
      status: "completed",
      createdAt: {
        $gte: new Date(`${date}T00:00:00.000Z`),
        $lt: new Date(`${date}T23:59:59.999Z`),
      },
    }).exec();
    res.status(200).json({ completedTodos });
  } catch (err) {
    res
      .status(500)
      .json({ error: err.message, message: "Error fetching completed todos" });
  }
});

app.get("/todos/count", async (req, res) => {
  try {
    const totalCompletedTodos = await Todo.countDocuments({
      status: "completed",
    }).exec();
    const totalPendingTodos = await Todo.pendingDocuments({
      status: "pending",
    }).exec();

    res.status(200).json({
      totalCompletedTodos,
      totalPendingTodos,
      message: "here are total todos",
    });
  } catch (err) {
    res.status(500).json({ err: "network error" });
  }
});
