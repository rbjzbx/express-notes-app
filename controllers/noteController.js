import pool from "../config/db.js";

// 创建笔记
export const createNote = async (req, res) => {
  try {
    const { 
      userId, 
      title, 
      url, 
      content = null, 
      categoryId = null, 
      tags = [], 
      is_public = 1,
      word_count = 0,
      view_count = 1,    // 默认浏览量为1
      reading_time = 0   // 默认阅读时长为0
    } = req.body;
    
    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO notes 
       (user_id, title, content, category_id, tags, url, is_deleted, is_public, word_count, view_count, reading_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        title, 
        content,
        categoryId, 
        tags && tags.length ? JSON.stringify(tags) : null,
        url,
        0, // is_deleted
        is_public,
        word_count,
        view_count,   // 插入浏览量
        reading_time  // 插入阅读时长
      ]
    );

    res.status(201).json({
      id: result.insertId,
      userId,
      title,
      content,
      categoryId,
      tags,
      url,
      is_deleted: 0,
      is_public,
      word_count,
      view_count,    // 返回浏览量
      reading_time   // 返回阅读时长
    });
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
};

// 获取笔记列表
export const getNotes = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query("SELECT * FROM notes WHERE user_id = ?AND is_deleted = 0", [
      userId,
    ]);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// 获取公开笔记列表
export const getPublicNotes = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query("SELECT * FROM notes WHERE  is_deleted = 0 AND is_public = 1");
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// 根据分类获取笔记列表
export const getNotesByCategory = async (req, res) => {
  try {
    const { userId, categoryId } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM notes WHERE user_id = ? AND category_id = ?AND is_deleted = 0",
      [userId, categoryId]
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 获取单个笔记
export const getNote = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先查询笔记是否存在
    const [rows] = await pool.query("SELECT * FROM notes WHERE id = ? AND is_deleted = 0", [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    // 更新浏览量（原子操作避免并发问题）
    await pool.query(
      "UPDATE notes SET view_count = view_count + 1 WHERE id = ?", 
      [id]
    );

    // 重新获取更新后的笔记数据
    const [updatedRows] = await pool.query(
      "SELECT * FROM notes WHERE id = ?", 
      [id]
    );

    res.status(200).json(updatedRows[0]);
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({ error: error.message });
  }
};

// 更新笔记
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    await pool.query(
      "UPDATE notes SET content = ? WHERE id = ?",
      [content, id]
    );
    res.status(200).json({ id, content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 删除笔记
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params; // 从URL参数获取笔记ID

    // 验证笔记是否存在且未被删除
    const [existingNote] = await pool.query(
      "SELECT id FROM notes WHERE id = ? AND is_deleted = 0",
      [id]
    );

    if (existingNote.length === 0) {
      return res.status(404).json({ 
        error: "笔记不存在或已被删除" 
      });
    }

    // 执行软删除（更新is_deleted字段）
    const [result] = await pool.query(
      "UPDATE notes SET is_deleted = 1 WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "删除笔记失败" });
    }

    res.status(200).json({ 
      success: true,
      message: "笔记已成功删除",
      noteId: id
    });

  } catch (error) {
    console.error("删除笔记失败:", error);
    res.status(500).json({ 
      error: "删除笔记失败",
      details: error.message 
    });
  }
};
// 获取用户的所有标签（最终修正版）
export const getTags = async (req, res) => {
  try {
    const { userId } = req.params;

    // 验证userId
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({ error: "无效的用户ID" });
    }

    // 查询该用户的所有笔记标签
    const [rows] = await pool.query(
      "SELECT tags FROM notes WHERE user_id = ?",
      [userId]
    );

    // 处理空结果
    if (!rows || rows.length === 0) {
      return res.status(200).json([]);
    }

    // 提取并处理标签（假设tags已经是数组）
    const allTags = rows.flatMap(note => {
      // 确保tags存在且是数组
      if (!note.tags || !Array.isArray(note.tags)) {
        return [];
      }
      
      // 过滤无效标签并转换为字符串
      return note.tags
        .map(tag => {
          if (tag === null || tag === undefined) return null;
          return String(tag).trim();
        })
        .filter(tag => tag && tag.length > 0); // 过滤空字符串
    });

    // 统计标签频率（不区分大小写）
    const tagCounts = allTags.reduce((acc, tag) => {
      const lowerTag = tag.toLowerCase();
      acc[lowerTag] = (acc[lowerTag] || 0) + 1;
      return acc;
    }, {});

    // 排序：频率降序，同频按字母顺序
    const sortedTags = Object.entries(tagCounts)
      .sort(([tagA, countA], [tagB, countB]) => {
        return countB - countA || tagA.localeCompare(tagB);
      })
      .map(([tag]) => tag);

    res.status(200).json(sortedTags);
  } catch (error) {
    console.error('获取标签失败:', error);
    res.status(500).json({ 
      error: "获取标签失败",
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        stack: error.stack 
      })
    });
  }
};