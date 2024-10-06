const express = require("express"); //express 모듈을 가져옴
const cors = require("cors"); //cors(Cross-Origin Resource Sharing) 모듈을 가져옴. 다른 도메인에서 서버의 리소스에 접근할 수 있도록 하는 방법
const { Pool } = require("pg"); //pg 모듈에서 Pool 클래스를 가져옴. PostgreSQL DB를 Node.js Application과 연결해주는 라이브러리
require("dotenv").config(); //dotenv 패키지가 .env 파일에 정의된 환경 변수를 로드하도록 함.
console.log(process.env.DATABASE_URL); //환경변수값 체크

const app = express(); //express application 초기화. app 객체는 HTTP 요청 처리에 사용.
app.use(cors()); //cors 미들웨어 추가
app.use(express.json()); //JSON형식의 요청 본문을 자동으로 파싱하여 req.body에 넣어줌.

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, //DB와 연결
  ssl: false, //ssl 사용x
});

//방명록 항목 추가
app.post("/api/guestbook", async (req, res) => {
  const { name, message, password } = req.body;
  try {
    //Q. guestbook 이라는 테이블에 name, message, password 컬럼에 값을 추가하세요. 값을 추가하고, 바로 반환해서 확인하세요.
    const result = await pool.query("INSERT INTO guestbook (name, message, password) VALUES ($1, $2, $3) RETURNING *", [
      name,
      message,
      password,
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//방명록 항목 가져오기
app.get("/api/guestbook", async (req, res) => {
  try {
    //Q. id, name, message, created_at 컬럼을 guestbook 테이블에서 가져오고, id를 내림차순으로 정렬하세요.
    const result = await pool.query("SELECT id, name, message, created_at FROM guestbook ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//방명록 항목 수정
app.put("/api/guestbook/:id", async (req, res) => {
  const { id } = req.params;
  const { message, password } = req.body;
  try {
    //Q. guestbook 테이블에서 id로 특정 항목의 비밀번호를 가져오세요.
    const result = await pool.query("SELECT password FROM guestbook WHERE id = $1", [id]);
    if (result.rows.length > 0 && result.rows[0].password === password) {
      //Q. guestbook 테이블에서 id로 특정 항목의 message를 업데이트하세요.
      const updateResult = await pool.query(
        "UPDATE guestbook SET message = $1 WHERE id = $2 RETURNING id, name, message, created_at",
        [message, id]
      );
      res.json(updateResult.rows[0]);
    } else {
      res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//방명록 항목 삭제
app.delete("/api/guestbook/:id", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  try {
    //Q. guestbook 테이블에서 id로 특정 항목의 비밀번호를 가져오세요.
    const result = await pool.query("SELECT password FROM guestbook WHERE id = $1", [id]);
    if (result.rows.length > 0 && result.rows[0].password === password) {
      //Q. guestbook 테이블에서 id로 특정 항목을 삭제하세요.
      await pool.query("DELETE FROM guestbook WHERE id = $1", [id]);
      res.json({ message: "삭제되었습니다." });
    } else {
      res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 좋아요 추가 및 취소 API
app.post("/api/guestbook/:id/like", async (req, res) => {
  const { id } = req.params; // 방명록 항목의 id
  const { user_id } = req.body; // 클라이언트에서 전달된 user_id

  if (!user_id) {
    return res.status(400).json({ error: "user_id가 필요합니다." });
  }

  try {
    // 이미 좋아요를 눌렀는지 확인
    const likeCheck = await pool.query(
      "SELECT * FROM likes WHERE guestbook_id = $1 AND user_id = $2",
      [id, user_id]
    );

    if (likeCheck.rows.length > 0) {
      // 이미 좋아요가 눌린 상태라면 좋아요 취소
      await pool.query("DELETE FROM likes WHERE guestbook_id = $1 AND user_id = $2", [id, user_id]);

      // 좋아요 취소 후 현재 좋아요 수 반환
      const result = await pool.query("SELECT COUNT(*) AS like_count FROM likes WHERE guestbook_id = $1", [id]);
      return res.json({ message: "좋아요가 취소되었습니다.", like_count: result.rows[0].like_count });
    } else {
      // 좋아요가 눌리지 않은 상태라면 좋아요 추가
      const result = await pool.query(
        "INSERT INTO likes (guestbook_id, user_id) VALUES ($1, $2) RETURNING *",
        [id, user_id]
      );

      // 좋아요 추가 후 현재 좋아요 수 반환
      const likeCount = await pool.query("SELECT COUNT(*) AS like_count FROM likes WHERE guestbook_id = $1", [id]);
      return res.json({ message: "좋아요가 추가되었습니다.", like_count: likeCount.rows[0].like_count });
    }
  } catch (err) {
    console.error("좋아요 처리 중 오류:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// 좋아요 수 조회 API
app.get("/api/guestbook/:id/likes", async (req, res) => {
  const { id } = req.params; // 방명록 항목의 id

  try {
    // 특정 방명록 항목의 좋아요 수 조회
    const result = await pool.query("SELECT COUNT(*) AS like_count FROM likes WHERE guestbook_id = $1", [id]);
    res.json({ like_count: result.rows[0].like_count });
  } catch (err) {
    console.error("좋아요 수 조회 중 오류:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// 방명록 항목 검색 API
app.get("/api/guestbook/search", async (req, res) => {
  const { query } = req.query; // 클라이언트에서 전달된 검색어

  try {
    // 검색어가 없거나 빈 문자열인 경우 전체 목록 반환
    if (!query || query.trim() === "") {
      const result = await pool.query("SELECT * FROM guestbook ORDER BY id DESC");
      return res.json(result.rows);
    }

    // 검색어를 포함하는 메시지 필드에서 검색
    const result = await pool.query(
      "SELECT * FROM guestbook WHERE message ILIKE $1 ORDER BY id DESC",
      [`%${query}%`] // ILIKE는 대소문자를 구분하지 않는 부분 일치 검색
    );
    res.json(result.rows);
  } catch (err) {
    console.error("검색 중 오류 발생:", err.message);
    res.status(500).json({ error: err.message });
  }
});



//서버 실행
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
