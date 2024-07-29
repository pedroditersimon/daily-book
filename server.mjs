import {Controller, Note} from "./back/Controller.js";
const controller = new Controller();

// define path vars
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import express from "express";
const app = express();
app.use(express.static(__dirname + '/front'));

import bodyParser from 'body-parser';
const { urlencoded } = bodyParser;
app.use(urlencoded({ extended: true }));

//const host = "127.0.0.1";
//const host = "192.168.100.12";
const port = process.env.PORT || 3000;

// Requiring fs module to read files
import { readFile } from 'fs/promises';

async function getHTML(path) {
    try {
        const data = await readFile(path);
        return data.toString();
    } catch (err) {
        throw err;
    }
}

// load html files
const editNoteHtml = await getHTML("./front/EditNote.html");
const noteListElementHtml = await getHTML("./front/NoteListElement.html");
const notFoundHtml = await getHTML("./front/NotFound.html");
const groupNotesHtml = await getHTML("./front/GroupNotes.html");
const searchNotesHtml = await getHTML("./front/SearchNotes.html");


function formatDate(date = new Date()) {
    // date is a Date() object

    let day = date.getDate();
    let month = date.getMonth() + 1; // month starts in 0
    let year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function invertFormatDate(date) {
    // invalid date
    if (date == undefined || date == null || date.length != 10) 
        return null;

    // date picker come in the format [yyyy-mm-dd]
    // fromat it to [dd-mm-yyyy]
    const splittedDate = date.split("-");
    return `${splittedDate[2]}-${splittedDate[1]}-${splittedDate[0]}`;
}

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
function getDayName(dateString) {
    var d = new Date(dateString + 'T00:00:00');
    return days[d.getDay()];
}

// note home page
app.get("/", (req, res) => {
    res.statusCode = 200;
    res.redirect("/notes/search");
});

// note home page
app.get("/home", (req, res) => {
    res.statusCode = 200;
    res.redirect("/notes/search");
});

// create note page
app.get("/notes/search", async (req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "text/html");

    var searchDate = invertFormatDate(req.query.associatedDate);
    // invalid date
    if (searchDate == null) {
        // query request is set to any date
        searchDate = {$regex: ""};
    }

    const notesResult = await controller.getNotes(
        {
            "tittle": {$regex: req.query.tittle || ""},
            "tags": {$regex: req.query.tags || ""},
            "associatedDate": searchDate
        }, {}, {"associatedDate": -1}, 10
    );

    var notesGroupDict = {};
    notesResult.forEach(note => {
        // create a new note list element
        var noteElement = noteListElementHtml
            .replaceAll("{{note_id}}", note._id)
            .replaceAll("{{tittle}}", note.tittle)
            .replaceAll("{{tags}}", note.tags)
            .replaceAll("{{description}}", note.description);
        
        var noteDayName = getDayName(invertFormatDate(note.associatedDate));
        var noteDate = `${noteDayName} ${note.associatedDate}`;

        // create a new group for that date
        if (!(noteDate in notesGroupDict)) {
            notesGroupDict[noteDate] = [];
        }
        // add the new note to date group
        notesGroupDict[noteDate].push(noteElement);
    });

    // html string
    var notesGroup = "";
    for(var key in notesGroupDict) {
        var value = notesGroupDict[key];
        
        // get the note list in one string
        var notesElements = value.join(" ");

        // create a new group element
        var groupElement = groupNotesHtml
            .replaceAll("{{group_text}}", key)
            .replaceAll("{{notes_elements}}", notesElements);

        notesGroup += groupElement;
    }

    // insert the groups in the list
    const html = searchNotesHtml
        .replaceAll("{{note_list_elements}}", notesGroup);
    res.end(html);
});

// create note page
app.get("/notes/edit", (req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "text/html");

    // set empty note default values
    const html = editNoteHtml
        .replaceAll("{{note_id}}", "")
        .replaceAll("{{tittle}}", "New note")
        .replaceAll("{{description}}", "")
        .replaceAll("{{tags}}", "")
        .replaceAll("{{associatedDate}}", invertFormatDate(formatDate()));
    res.end(html);
});

// edit note post
app.get("/notes/edit/:noteID", async (req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "text/html");

    // the mongoDB ObjectID lenght
    if (req.params.noteID.length != 24) {
        res.statusCode = 404;
        res.end(notFoundHtml);
        return;
    }

    const noteResult = await controller.getNoteByID(req.params.noteID);

    // note not found
    if (!noteResult.isValid()) {
        res.statusCode = 404;
        res.end(notFoundHtml);
        return;
    }

    const html = editNoteHtml
        .replaceAll("{{note_id}}", noteResult._id)
        .replaceAll("{{tittle}}", noteResult.tittle)
        .replaceAll("{{description}}", noteResult.description)
        .replaceAll("{{tags}}", noteResult.tags)
        .replaceAll("{{associatedDate}}", invertFormatDate(noteResult.associatedDate));
    res.end(html);
});


// save/update note post
app.post("/notes/edit", async (req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "text/html");

    var jsonObj = req.body;
    jsonObj.associatedDate = invertFormatDate(jsonObj.associatedDate);

    const filter = { _id: jsonObj.noteID };
    const createNew = jsonObj.noteID == "";
    const noteResult = await controller.updateNote(filter, jsonObj, createNew);
    res.redirect("/notes/search");
});

// delete note post
app.post("/notes/delete", async (req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "text/html");

    const noteResult = await controller.deleteNote(req.body.noteID);

    res.redirect("/notes/search/");
});


app.listen(port, () => {
    //console.log(`Server started! http://${host}:${port}`);
});