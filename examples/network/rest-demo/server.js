import express from 'express';
import cors from 'cors';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database
let todos = [
  { id: 1, title: 'Learn REST API', completed: false },
  { id: 2, title: 'Build a demo', completed: false },
  { id: 3, title: 'Test the API', completed: false }
];

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the REST API Demo!' });
});

// GET all todos
app.get('/api/todos', (req, res) => {
  res.json(todos);
});

// GET a single todo
app.get('/api/todos/:id', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id));
  if (!todo) return res.status(404).json({ message: 'Todo not found' });
  res.json(todo);
});

// CREATE a new todo
app.post('/api/todos', (req, res) => {
  if (!req.body.title) {
    return res.status(400).json({ message: 'Title is required' });
  }
  
  const newTodo = {
    id: todos.length + 1,
    title: req.body.title,
    completed: req.body.completed || false
  };
  
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

// UPDATE a todo
app.put('/api/todos/:id', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id));
  if (!todo) return res.status(404).json({ message: 'Todo not found' });
  
  todo.title = req.body.title || todo.title;
  todo.completed = req.body.completed !== undefined ? req.body.completed : todo.completed;
  
  res.json(todo);
});

// DELETE a todo
app.delete('/api/todos/:id', (req, res) => {
  const todoIndex = todos.findIndex(t => t.id === parseInt(req.params.id));
  if (todoIndex === -1) return res.status(404).json({ message: 'Todo not found' });
  
  todos = todos.filter(t => t.id !== parseInt(req.params.id));
  res.status(204).send();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`- GET    http://localhost:${PORT}/api/todos`);
  console.log(`- POST   http://localhost:${PORT}/api/todos`);
  console.log(`- GET    http://localhost:${PORT}/api/todos/:id`);
  console.log(`- PUT    http://localhost:${PORT}/api/todos/:id`);
  console.log(`- DELETE http://localhost:${PORT}/api/todos/:id`);
});

export default app;
