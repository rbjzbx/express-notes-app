import pool from "../config/db.js";

// 注册用户
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, nickname, avatar_url } = req.body;
    const [result] = await pool.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );
    res.status(201).json({ id: result.insertId, username, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 登录用户
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );
    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 获取用户信息
export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// 更新用户信息
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, email, phone } = req.body;

    // 检查用户是否存在
    const [userRows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // 构建更新字段和值的数组
    const updateFields = [];
    const updateValues = [];
    
    if (nickname !== undefined) {
      updateFields.push("nickname = ?");
      updateValues.push(nickname);
    }
    
    if (email !== undefined) {
      updateFields.push("email = ?");
      updateValues.push(email);
    }
    
    if (phone !== undefined) {
      updateFields.push("phone = ?");
      updateValues.push(phone);
    }

    // 如果没有提供任何可更新字段
    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // 执行更新
    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
    updateValues.push(id);
    
    await pool.query(query, updateValues);

    // 返回更新后的用户信息
    const [updatedRows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    res.status(200).json(updatedRows[0]);

  } catch (error) {
    // 处理唯一约束冲突（如邮箱已存在）
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: error.message });
  }
};