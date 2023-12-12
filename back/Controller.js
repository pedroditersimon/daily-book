import DatabaseHandler from "./DatabaseHandler.js";

function formatDate(date = new Date()) {
    // date is a Date() object

    let day = date.getDate();
    let month = date.getMonth() + 1; // month starts in 0
    let year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

class Note {
    _id;

    // dates
    creationDate;
    associatedDate;
    deletionDate;

    tittle;
    description;
    tags;

    constructor(jsonObj = {}) {
        if (jsonObj == null || jsonObj == undefined)
            return;

        // ------- map the given object -------->
        this._id = jsonObj._id || null;

        // dates
        this.creationDate = jsonObj.creationDate || formatDate();
        this.associatedDate = jsonObj.associatedDate || formatDate();
        this.deletionDate = jsonObj.deletionDate || null;

        this.tittle = jsonObj.tittle || 'New note';
        this.description = jsonObj.description || '';

        this.tags = jsonObj.tags || "";
        // <--------------------------------------
    }

    isValid() {
        return this.creationDate != undefined;
    }

    isInDeletion() {
         deletionDate != null;
    }

    toJSON() {
        return {
            "_id": this._id,
            "creationDate": this.creationDate,
            "associatedDate": this.associatedDate,
            "deletionDate": this.deletionDate,
            "tittle": this.tittle,
            "description": this.description,
            "tags": this.tags
        };
    }
}


class Controller {
    dbHandler;

    constructor() {
        this.dbHandler = new DatabaseHandler({
            URI: `mongodb+srv://daily-book-cluster:${process.env.DB_PASS}@dailybookcluster.ecfpy6n.mongodb.net/?retryWrites=true&w=majority`,
            databaseName: "DailyBook"
        });
    }

    async getNotes(query, options, sort, maxCount=100) {
        const cursor = await this.dbHandler.getManyFrom("notes", query, options, sort );
        
        var notes = [];
        var it = 0;
        for await (const jsonObj of cursor) {
            notes.push(new Note(jsonObj));

            if (++it >= maxCount)
                break;
        }

        return notes;
    }

    async getNote(query) {
        const dbResult = await this.dbHandler.findOneFrom("notes", query );

        return new Note(dbResult);
    }

    async getNoteByID(id) {
        const dbResult = await this.dbHandler.findOneIDFrom("notes", id );

        return new Note(dbResult);
    }

    async createNote(jsonObj) {
        const noteObj = new Note(jsonObj);
        const noteJSON = noteObj.toJSON();

        const dbResult = await this.dbHandler.insertOne("notes", noteJSON);
        
        return dbResult;
    }

    async updateNote(filter, jsonObj, createNew=false) {
        const noteJson = new Note(jsonObj).toJSON();

        // avoid update this values on existing note
        if (!createNew) {
            delete noteJson.creationDate;
            delete noteJson.deletionDate;
        }

        const dbResult = await this.dbHandler.updateOne(
            "notes", filter,
            [
                { $set: noteJson },
                { $unset: ["_id"] }
            ],
            createNew
        );

        return dbResult;
    }

    async deleteNote(id) {
        if (!id)
            return;
        
        const dbResult = await this.dbHandler.deleteOne("notes", id );
        
        return dbResult;
    }

}


export  {Controller, Note};