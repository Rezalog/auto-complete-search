const express = require('express')
const router = express.Router();
const { getAutocompleteSuggestions } = require('../services/autocomplete');

// GET(/) 인 경우 query string 에 따른 검색 조건 비동기 처리 반환(json)
router.get('/', async (req, res) => {
    const query = req.query.q
    // query 가 없는 경우 400 return(필수 입력)
    if(!query) {
        return res.status(400).json({ error: 'Query parameter is required'})
    }
    const suggestions = await getAutocompleteSuggestions(query);
    res.json(suggestions);
})

module.exports = router;