import express from "express";
import {
  createNote,
  getNotes,
  getPublicNotes,
  getNote,
  updateNote,
  deleteNote,
  getNotesByCategory,
  getTags,  // Import the new getTags function
} from "../controllers/noteController.js";

const router = express.Router();

router.post("/", createNote);
router.get("/user/:userId", getNotes);
router.get("/", getPublicNotes);
router.get("/:id", getNote);
router.get("/categories/:userId/:categoryId", getNotesByCategory);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);
router.get("/tags/:userId", getTags);  // Add the new route for getting all tags

export default router;