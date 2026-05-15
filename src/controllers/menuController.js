const db = require("../config/db");

exports.getMenu = (req, res) => {
    const customQuery = req.query.category ? "SELECT * FROM menu_items WHERE category = ?" : "SELECT * FROM menu_items";
    const params = req.query.category ? [req.query.category] : [];

    db.all(customQuery, params, (err, rows) => {
        if (err) {
            console.error("Error fetching menu:", err);
            return res.status(500).json({ error: "Database error..." });
        }
        res.json(rows);
    });
};
//
exports.addMenuItem = (req, res) => {
    const { name, price, description, category, image } = req.body;
    if (!name || !price) {
        return res.status(400).json({ message: "Name and Price are required" });
    }
    const query = "INSERT INTO menu_items (name, price, description, category, image) VALUES (?, ?, ?, ?, ?)";
    db.run(query, [name, price, description, category, image], function (err) {
        if (err) {
            console.error("Error adding item:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: "Item added successfully", id: this.lastID });
    });
};

exports.deleteMenuItem = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM menu_items WHERE id = ?", [id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Delete failed" });
        }
        res.json({ message: "Item deleted..." });
    });
};
