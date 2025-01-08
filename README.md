# auto-complete-search



### **검색 오토 컴플리트 프로젝트 `auto-complete-search` 구현 가이드**  
다음은 검색 오토 컴플리트 프로젝트를 처음부터 끝까지 구현하는 상세 가이드입니다. 프로젝트 이름은 **`auto-complete-search`**이며, Git과 다양한 캐싱 방법을 포함한 설정을 단계별로 다룹니다.

---

## **1단계: 프로젝트 초기화 및 환경 설정**

### **1.1 프로젝트 디렉토리 생성 및 Git 초기화**
1. 프로젝트 디렉토리 생성:
   ```bash
   mkdir auto-complete-search
   cd auto-complete-search
   ```

2. Git 초기화:
   ```bash
   git init
   ```

3. `.gitignore` 파일 생성:
   ```bash
   touch .gitignore
   echo "node_modules/" >> .gitignore
   echo ".env" >> .gitignore
   echo "dist/" >> .gitignore
   ```

4. GitHub 리포지토리 연결:
   ```bash
   git remote add origin https://github.com/username/auto-complete-search.git
   ```

### **1.2 백엔드 설정 (Express 기반 서버)**
1. Express 프로젝트 초기화:
   ```bash
   mkdir server
   cd server
   npm init -y
   npm install express cors dotenv sqlite3 redis nodemon
   ```

2. `server/package.json` 수정:
   ```json
   "scripts": {
     "start": "node index.js",
     "dev": "nodemon index.js"
   }
   ```

3. 디렉토리 구조:
   ```
   server/
   ├── index.js         # 서버 엔트리 포인트
   ├── routes/          # 라우트 관련 폴더
   │   └── autocomplete.js
   ├── cache/           # 캐싱 관련 모듈
   │   ├── memory.js
   │   └── redis.js
   ├── db/              # 데이터베이스 관련 폴더
   │   └── database.js
   ├── .env             # 환경변수 파일
   ├── package.json
   └── README.md
   ```

---

## **2단계: Express 서버 및 기본 API 구축**

### **2.1 Express 서버 생성**
1. `server/index.js`:
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const dotenv = require('dotenv');
   const autocompleteRoutes = require('./routes/autocomplete');

   dotenv.config();
   const app = express();
   const PORT = process.env.PORT || 5000;

   app.use(cors());
   app.use(express.json());
   app.use('/autocomplete', autocompleteRoutes);

   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
   ```

2. `.env` 파일 추가:
   ```
   PORT=5000
   ```

---

### **2.2 기본 API 라우팅**
1. `server/routes/autocomplete.js`:
   ```javascript
   const express = require('express');
   const router = express.Router();
   const { getAutocompleteSuggestions } = require('../services/autocomplete');

   router.get('/', async (req, res) => {
     const query = req.query.q;
     if (!query) {
       return res.status(400).json({ error: 'Query parameter is required' });
     }
     const suggestions = await getAutocompleteSuggestions(query);
     res.json(suggestions);
   });

   module.exports = router;
   ```

---

## **3단계: 데이터베이스 및 캐싱 구현**

### **3.1 SQLite 데이터베이스 설정**
1. SQLite 설치 및 초기화:
   - `server/db/database.js`:
     ```javascript
     const sqlite3 = require('sqlite3').verbose();
     const db = new sqlite3.Database('./data.db', (err) => {
       if (err) {
         console.error('Failed to connect to SQLite:', err.message);
       } else {
         console.log('Connected to SQLite database.');
       }
     });

     db.serialize(() => {
       db.run(`
         CREATE TABLE IF NOT EXISTS keywords (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           keyword TEXT NOT NULL
         )
       `);
     });

     module.exports = db;
     ```

2. 데이터 삽입:
   ```javascript
   const keywords = ['apple', 'banana', 'cherry', 'date', 'elderberry'];
   keywords.forEach(keyword => {
     db.run('INSERT INTO keywords (keyword) VALUES (?)', [keyword]);
   });
   ```

### **3.2 기본 검색 로직**
1. `server/services/autocomplete.js`:
   ```javascript
   const db = require('../db/database');

   const getAutocompleteSuggestions = (query) => {
     return new Promise((resolve, reject) => {
       db.all(
         'SELECT keyword FROM keywords WHERE keyword LIKE ? LIMIT 10',
         [`${query}%`],
         (err, rows) => {
           if (err) {
             reject(err);
           } else {
             resolve(rows.map(row => row.keyword));
           }
         }
       );
     });
   };

   module.exports = { getAutocompleteSuggestions };
   ```

---

### **3.3 캐싱 구현**

#### **A. 메모리 캐싱**
- `server/cache/memory.js`:
   ```javascript
   const cache = new Map();

   const getFromCache = (key) => cache.get(key);
   const setToCache = (key, value) => {
     cache.set(key, value);
     setTimeout(() => cache.delete(key), 60000); // 1분 TTL
   };

   module.exports = { getFromCache, setToCache };
   ```

#### **B. Redis 캐싱**
1. Redis 설치 및 설정:
   ```bash
   npm install redis
   ```

2. `server/cache/redis.js`:
   ```javascript
   const redis = require('redis');
   const client = redis.createClient();

   client.connect().catch(console.error);

   const getFromCache = async (key) => {
     const data = await client.get(key);
     return JSON.parse(data);
   };

   const setToCache = async (key, value) => {
     await client.setEx(key, 60, JSON.stringify(value)); // 1분 TTL
   };

   module.exports = { getFromCache, setToCache };
   ```

---

## **4단계: 클라이언트 구현**

### **4.1 React 클라이언트 생성**
1. 프로젝트 생성:
   ```bash
   npx create-react-app client
   cd client
   ```

2. API 연동:
   - `client/src/App.js`:
     ```javascript
     import React, { useState } from 'react';

     function App() {
       const [query, setQuery] = useState('');
       const [suggestions, setSuggestions] = useState([]);

       const fetchSuggestions = async (input) => {
         const response = await fetch(`http://localhost:5000/autocomplete?q=${input}`);
         const data = await response.json();
         setSuggestions(data);
       };

       const handleInputChange = (e) => {
         const value = e.target.value;
         setQuery(value);
         if (value.length >= 2) {
           fetchSuggestions(value);
         } else {
           setSuggestions([]);
         }
       };

       return (
         <div>
           <input type="text" value={query} onChange={handleInputChange} />
           <ul>
             {suggestions.map((suggestion, index) => (
               <li key={index}>{suggestion}</li>
             ))}
           </ul>
         </div>
       );
     }

     export default App;
     ```

---

## **5단계: 성능 최적화**
1. **디바운스 적용**:
   ```javascript
   let debounceTimer;
   const debounce = (callback, delay) => {
     return (...args) => {
       clearTimeout(debounceTimer);
       debounceTimer = setTimeout(() => callback(...args), delay);
     };
   };

   const handleInputChange = debounce((e) => {
     const value = e.target.value;
     setQuery(value);
     if (value.length >= 2) {
       fetchSuggestions(value);
     } else {
       setSuggestions([]);
     }
   }, 300);
   ```

---

## **6단계: Git 커밋 및 푸시**
1. Git 상태 확인:
   ```bash
   git status
   ```

2. 커밋 및 푸시:
   ```bash
   git add .
   git commit -m "Initial commit for auto-complete-search"
   git push origin main
   ```

---

이 가이드에 따라 프로젝트를 처음부터 끝까지 완성할 수 있습니다. 추가적인 요구사항이 있다면 언제든 말씀해주세요! 😊