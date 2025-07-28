import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json())

let request = "/books";

app.get("/", async (req, res) => {
    const response = await axios.get(API_URL + request);
    console.log(response.data);
    const books = response.data;

    for (let i = 0; i < books.length; i++) {
        books[i].img = `https://covers.openlibrary.org/b/isbn/${books[i].isbn}-S.jpg`
    }

    res.render("index.ejs",
    {
        books: response.data
    });
});

app.get("/view/book/:id", async (req, res) => {
    const response = await axios.get(`${API_URL}/book/${req.params.id}`);
    console.log(response.data);
    const book = response.data;
    console.log(book.id);
    const notes = await axios.get(`${API_URL}/note/${book.id}`)

    res.render("bookview.ejs", 
    {
        book: book,
        img: `https://covers.openlibrary.org/b/isbn/${book.isbn}-S.jpg`,
        notes: notes.data
    })
});

app.get("/edit/book/:id", async (req, res) => {
    console.log("in edit block");
    const id = req.params.id;
    const response = await axios.get(`${API_URL}/book/${id}`);
    const book = response.data;
    console.log("book:");
    console.log(book);
    
    const notes = await axios.get(`${API_URL}/note/${book.id}`)
    console.log("Notes:")
    console.log(notes.data);

    res.render("editbook.ejs", 
    {
        book: book,
        notes: notes.data
    });
});

app.get("/add/book", (req, res) => {

    res.render("createbook.ejs");
});

app.post("/submitAdd", async (req, res) => {
    console.log("in submit add");
    console.log(req.body);

    const title = req.body.title;
    const isbn = req.body.isbn;
    const rating = req.body.rating;
    const dayofread = req.body.dayofread;
    const about = req.body.about;
    
    const notes = [];
    if (req.body.citation || req.body.citation === '') {
        if (Array.isArray(req.body.citation)) {
            for (let i = 0; i < req.body.citation.length; i++) {
                const obj = {
                    citation: req.body.citation[i],
                    owncomment: req.body.owncomment[i]
                }

                notes.push(obj);
            }
        } else {
            const obj = {
                citation: req.body.citation,
                owncomment: req.body.owncomment
            }
            notes.push(obj);
        }
    }

    console.log("Notes:");
    console.log(notes);
    
    const newBook = {
        title: title,
        isbn: isbn,
        rating: rating,
        dayofread: dayofread,
        about: about,
        notes: notes
    }

    console.log(newBook);
    
    try {

        await axios.post(`${API_URL}/add/book`, newBook);
        res.redirect("/");

    } catch (err) {
        // res.status(500).json({error: "Error in saving book to database."})
        console.log("redirect to submitAdd");
        const errorMessages = {
            
        };
        const keys = []

        if (title.length === 0) {
            errorMessages.title = "The Title must not be empty!";
            keys.push("title");
        } 

        if (dayofread.length === 0) {
            errorMessages.dayofread = "Day of read must not be empty!";
            keys.push("dayofread");
        }

        if (isbn.length === 0) {
            errorMessages.isbn = "The ISBN must not be empty!";
            keys.push("isbn");
        }

        res.render("createbook.ejs", 
        {
            keys: keys,
            errorMessages: errorMessages
        });
    }
   
    
});

app.post("/submitEdit/:id", async (req, res) => {
    console.log("in submit edit");
    console.log(req.body);

    const bookId = req.params.id;
    const title = req.body.title;
    const isbn = req.body.isbn;
    const rating = req.body.rating;
    const dayofread = req.body.dayofread;
    const about = req.body.about;

    let notes = [];

    if (!req.body.noteId) {
        if (req.body.citation) {
            for (let i = 0; i < req.body.citation.length; i++) {
                const note = {
                    id: "new",
                    citation: req.body.citation[i],
                    owncomment: req.body.owncomment[i]
                }
                notes.push(note);
            }
        }
    } else {

        for (let i = 0; i < req.body.noteId.length; i++) {
            const note = {
                id: req.body.noteId[i],
                citation: req.body.citation[i],
                owncomment: req.body.owncomment[i]
            }

            notes.push(note);
        }

        for (let i = req.body.noteId.length; i < req.body.citation.length; i++) {
            const note = {
                id: "new",
                citation: req.body.citation[i],
                owncomment: req.body.owncomment[i]
            }
            notes.push(note);
        }
    }

    console.log(notes);

    const toBeUpdatedBook = {
        id: bookId,
        title: title,
        isbn: isbn,
        rating: rating,
        dayofread: dayofread,
        about: about,
        notes: notes
    }

    try {

        await axios.patch(`${API_URL}/edit/book/${bookId}`, toBeUpdatedBook);

    } catch (err) {
        // res.status(500).json({error: "Error in saving editted book to database."})
        res.render("/submitEdit/" + bookId);
    }
    res.redirect("/");
});

app.get("/delete/book/:id", async (req, res) => {
    console.log("In delete route:");
    console.log(req.params.id);
    const id = req.params.id;

    try {

        await axios.delete(`${API_URL}/delete/book/${id}`);

    } catch (err) {
        res.status(500).json({error: "Error in deleting book from database."})
    }
   

    res.redirect("/");
});

app.get("/delete/note/:noteId/:bookId", async (req, res) => {
    console.log("In /delete/note");
    console.log(req.body);
    console.log(req.params);
    const noteId = req.params.noteId;
    const bookId = req.params.bookId;

    try {

        await axios.delete(`${API_URL}/delete/note/${noteId}`);

    } catch (err) {
        res.status(500).json({error: "Error in deleting note."})
    }

    res.redirect(`/edit/book/${bookId}`);

});

app.get("/sortby/rating", (req, res) => {
    request = "/sort/book/rating";
    res.redirect("/");
});

app.get("/sortby/recency", (req, res) => {
    request = "/sort/book/recency";
    res.redirect("/");
});

app.get("/sortby/title", (req, res) => {
    request = "/sort/book/title";
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});