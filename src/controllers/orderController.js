const db = require("../config/db");

exports.placeOrder = (req, res) => {
    const { customer_name, customer_phone, items, total_amount, address, coordinates } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: "No items in order" });
    }

    let coordStr = '';
    try {
        if (typeof coordinates === 'string') {
            coordStr = coordinates;
        } else if (coordinates) {
            coordStr = JSON.stringify(coordinates);
        }
    } catch (_) {
        coordStr = '';
    }

    const safeName = (customer_name || '').toString().trim() || 'Guest';
    const safePhone = (customer_phone || '').toString().trim() || 'N/A';
    const safeAddress = (address || '').toString().trim() || 'Not provided';
    const safeTotal = parseFloat(total_amount) || 0;

    db.serialize(() => {
        db.run(
            "INSERT INTO orders (customer_name, customer_phone, total_amount, address, coordinates) VALUES (?, ?, ?, ?, ?)",
            [safeName, safePhone, safeTotal, safeAddress, coordStr],
            function (err) {
                if (err) {
                    console.error("❌ Order DB insert failed:", err.message);
                    return res.status(500).json({ error: "Failed to create order: " + err.message });
                }

                const orderId = this.lastID;

                const stmt = db.prepare(
                    "INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)"
                );

                items.forEach(item => {
                    stmt.run(orderId, item.name || 'Unknown', item.quantity || 1, parseFloat(item.price) || 0);
                });

                stmt.finalize(finErr => {
                    if (finErr) {
                        console.error("❌ Order items insert failed:", finErr.message);
                        return res.status(500).json({ error: "Order saved but items failed: " + finErr.message });
                    }
                    console.log(`✅ Order #${orderId} placed!! — ${items.length} item(s) — ₹${safeTotal}`);
                    res.status(201).json({ message: "Order placed successfully!", orderId });
                });
            }
        );
    });
};

exports.getAllOrders = (req, res) => {
    const query = `
        SELECT o.id, o.customer_name, o.total_amount, o.status, o.created_at,
        (SELECT json_group_array(json_object('name', oi.item_name, 'qty', oi.quantity)) 
         FROM order_items oi WHERE oi.order_id = o.id) as items
        FROM orders o 
        ORDER BY o.created_at DESC
    `;


    const simpleQuery = "SELECT * FROM orders ORDER BY created_at DESC";

    db.all(simpleQuery, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Fetch error" });
        }
        res.json(rows);
    });
};

exports.updateOrderStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Update failed" });
        }
        res.json({ message: "Order updated" });
    });
};

exports.getOrderDetails = (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
        if (err || !order) return res.status(404).json({ message: "Order not found" });

        db.all("SELECT * FROM order_items WHERE order_id = ?", [id], (err, items) => {
            if (err) return res.status(500).json({ message: "Error fetching items" });
            res.json({ ...order, items });
        });
    });
};

exports.getMyOrders = (req, res) => {
    const phone = (req.query.phone || '').trim();

    const query = phone
        ? "SELECT * FROM orders WHERE customer_phone = ? ORDER BY created_at DESC"
        : "SELECT * FROM orders ORDER BY created_at DESC LIMIT 20";
    const params = phone ? [phone] : [];

    db.all(query, params, (err, orders) => {
        if (err) {
            console.error("getMyOrders error:", err);
            return res.status(500).json({ error: "Fetch error" });
        }
        if (!orders || orders.length === 0) return res.json([]);

        const results = [];
        let done = 0;
        orders.forEach(order => {
            db.all("SELECT * FROM order_items WHERE order_id = ?", [order.id], (e, items) => {
                results.push({ ...order, items: items || [] });
                done++;
                if (done === orders.length) {
                    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    res.json(results);
                }
            });
        });
    });
};

