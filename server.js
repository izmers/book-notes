import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

const app = express();
const port = 4000;

dotenv.config();

const db = new pg.Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

async function getBooks() {
  const result = await db.query("SELECT * from book");
  return result.rows;
}

async function addBook(title, isbn, rating, dayOfRead, about, notes) {
  const result = await db.query(
    "INSERT INTO book (title, isbn, rating, dayofread, about) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [title, isbn, rating, dayOfRead, about]
  );

  const id = result.rows[0].id;

  for (let i = 0; i < notes.length; i++) {
    await db.query(
      "INSERT INTO note (citation, owncomment, book_id) VALUES ($1, $2, $3)",
      [notes[i].citation, notes[i].owncomment, id]
    );
  }

  return result.rows[0];
}

async function getNotesOfBook(bookId) {
  const result = await db.query("SELECT * FROM note where book_id = $1", [
    bookId,
  ]);

  return result.rows;
}

async function sortBooksByRating() {
  const result = await db.query("SELECT * FROM book ORDER BY rating DESC");

  return result.rows;
}

async function sortBooksByRecency() {
  const result = await db.query("SELECT * FROM book ORDER BY dayofread DESC");

  return result.rows;
}

async function sortBooksByTitle() {
  const result = await db.query("SELECT * FROM book ORDER BY title ASC");

  return result.rows;
}

async function getBookById(bookId) {
  const result = await db.query("SELECT * FROM book WHERE id = $1", [bookId]);

  return result.rows[0];
}

async function updateBook(book, notes) {
  await db.query("UPDATE book SET title = $1 WHERE id = $2", [
    book.title,
    book.id,
  ]);
  await db.query("UPDATE book SET isbn = $1 WHERE id = $2", [
    book.isbn,
    book.id,
  ]);
  await db.query("UPDATE book SET rating = $1 WHERE id = $2", [
    book.rating,
    book.id,
  ]);
  await db.query("UPDATE book SET dayofread = $1 WHERE id = $2", [
    book.dayofread,
    book.id,
  ]);
  await db.query("UPDATE book SET about = $1 WHERE id = $2", [
    book.about,
    book.id,
  ]);

  for (let i = 0; i < notes.length; i++) {
    if (notes[i].id === "new") {
      await db.query(
        "INSERT INTO note (citation, owncomment, book_id) VALUES ($1, $2, $3)",
        [notes[i].citation, notes[i].owncomment, book.id]
      );
    } else {
      await db.query(
        "UPDATE note SET citation = $1 WHERE id = $2 AND book_id = $3",
        [notes[i].citation, notes[i].id, book.id]
      );

      await db.query(
        "UPDATE note SET owncomment = $1 WHERE id = $2 AND book_id = $3",
        [notes[i].owncomment, notes[i].id, book.id]
      );
    }
  }
  console.log("i am here");
}

async function deleteBook(bookId) {
  await db.query("DELETE from note WHERE book_id = $1", [bookId]);
  await db.query("DELETE from book WHERE id = $1", [bookId]);
}

async function deleteNote(nodeId) {
  await db.query("DELETE from note WHERE id = $1", [nodeId]);
}

function transformDate(dayofread) {
  let date = new Date(dayofread);
  date = date.toLocaleDateString();
  console.log(date.split("."));
  let newDate =
    date.split(".")[2] +
    "-" +
    date.split(".")[1].padStart(2, "0") +
    "-" +
    date.split(".")[0].padStart(2, "0");
  console.log(newDate);

  return newDate;
}

app.get("/books", async (req, res) => {
  const books = await getBooks();
  for (let i = 0; i < books.length; i++) {
    books[i].dayofread = transformDate(books[i].dayofread);
  }

  res.json(books);
});

app.get("/book/:id", async (req, res) => {
  console.log(req.params);
  const id = parseInt(req.params.id);
  const book = await getBookById(id);

  book.dayofread = transformDate(book.dayofread);

  res.json(book);
});

app.get("/sort/book/rating", async (req, res) => {
  const books = await sortBooksByRating();

  for (let i = 0; i < books.length; i++) {
    books[i].dayofread = transformDate(books[i].dayofread);
  }

  res.json(books);
});

app.get("/sort/book/recency", async (req, res) => {
  const books = await sortBooksByRecency();

  for (let i = 0; i < books.length; i++) {
    books[i].dayofread = transformDate(books[i].dayofread);
  }

  res.json(books);
});

app.get("/sort/book/title", async (req, res) => {
  const books = await sortBooksByTitle();

  for (let i = 0; i < books.length; i++) {
    books[i].dayofread = transformDate(books[i].dayofread);
  }

  res.json(books);
});

app.get("/note/:bookId", async (req, res) => {
  console.log("get note");
  console.log(req.params);
  const bookId = parseInt(req.params.bookId);
  const result = await getNotesOfBook(bookId);

  res.json(result);
});

app.post("/add/book", async (req, res) => {
  console.log("in add book server.js");
  console.log(req.body);
  const title = req.body.title;
  const isbn = req.body.isbn;
  const rating = req.body.rating;
  const dayofread = req.body.dayofread;
  const about = req.body.about;
  const notes = req.body.notes;
  let book;

  try {
    if (isbn.length === 0 || dayofread.length === 0 || title.length === 0) {
      throw "jo scheiße gloffn";
    }

    book = await addBook(title, isbn, rating, dayofread, about, notes);

    res.status(201).json(book);
  } catch (err) {
    res
      .status(403)
      .json({ error: "Could not store book in database. Value might be null" });
  }
});

app.patch("/edit/book/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  console.log(req.body);

  const book = await getBookById(id);

  book.title = req.body.title || book.title;
  book.isbn = req.body.isbn || book.isbn;
  book.rating = req.body.rating || book.rating;
  book.dayofread = req.body.dayofread || book.dayofread;
  book.about = req.body.about || book.about;

  console.log(book);

  try {
    await updateBook(book, req.body.notes);
  } catch (err) {
    res.status(403).json({
      error: "Could not save editted book in database. Value might be null.",
    });
  }

  res.json(book);
});

app.delete("/delete/book/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  let books = await getBooks();
  const ids = [];
  books.forEach((book) => ids.push(book.id));

  try {
    if (!ids.includes(id)) {
      throw "Book with id " + id + " does not exist";
    }
  } catch (err) {
    res.status(404).json({ error: err });
  }

  try {
    await deleteBook(id);
  } catch (err) {
    res.send(403).status({
      error: "Could not delete book with the id " + id + " from the database.",
    });
  }

  res.status(200).json("Book deletion sucessfull.");
});

app.delete("/delete/note/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    await deleteNote(id);
  } catch (err) {
    res.status(403).json({
      error: "Coudl not delete note with the id " + id + "from the database.",
    });
  }

  res.status(200).json("Note Deletion sucessfull.");
});

app.listen(port, () => {
  console.log(`API is running on port ${port}`);
});
