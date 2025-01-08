/**
 * 서버 엔트리 포인트
 * Express 서버 생성
 */
const express = require('express')
const cors = require('cors')
const dotenv = require("dotenv");

dotenv.config(); // .env 파일에 있는 내용을 환경변수(process.env)의 default 설정으로 한다.
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())
// app.use('/autocomplete', autocompleteRoutes)

app.listen(PORT, () => console.log(`server running on PORT ${PORT}`))