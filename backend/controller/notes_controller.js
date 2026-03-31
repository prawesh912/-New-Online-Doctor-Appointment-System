import {pool, getNote, getNotes, createNote} from '../config/db_config.js'

export const getAllNotes = async (req, res) => {
    try{
        const notes = await getNotes();
        if(notes.length == 0) return res.status(404).json({success: false, message: 'Notes not found',notes: []});
        return res.status(200).json({ success: true, notes: notes});
    }catch (err){
        return res.status(500).json({ success: false, message: err.message});
    }
}

export const getNoteById = async (req, res) => {
    try{
        const id = req.params.id;
        const note = await getNote(id);
        if(note == undefined) return res.status(404).json({success: false, message: `note with ${id} not found.`, note: null});
        return res.status(200).json({ success: true, note: note})
    }catch (err){
        return res.status(500).json({ success: false, message: err.message});
    }
}

export const createNewNote = async (req, res) => {
    try{
        const {title, contents} = req.body;
        if(!title || !contents) return res.status(400).json({success: false, message: "title and contents are required"});
        const result = await createNote(title, contents);
        return res.status(201).json({success: true, message: 'Note created successfully', note: result});
    }catch (err) {
        return res.status(500).json({success: false, message: err.message})
    }
}