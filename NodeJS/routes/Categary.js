const express = require('express');
const router = express.Router();
const db = require('../db/database');

//For View All Categary
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM categarys';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: results });
    });
});



//For Add New Item to Shop
router.post('/', (req, res) => {
    const categaryname = req.body.categaryname;
    if (!categaryname) {
        return res.status(400).json({ message: 'categaryname is required' });
    }
    const sql = 'INSERT INTO categarys (categaryname) VALUES (?)';
    db.query(sql, [categaryname], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'categary created successfully', result });
    });
});


module.exports = router;
