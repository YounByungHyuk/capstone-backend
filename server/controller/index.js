const userDatabase = require("../Database"); // DB가져옴
const jwt = require("jsonwebtoken"); // jwt 토큰 사용을 위한 모듈 설정
const mysql = require("mysql");

const db = mysql.createPool({
  //db 설정
  host: "127.0.0.1", // 호스트
  user: "root", // 데이터베이스 계정
  password: "root", // 데이터베이스 비밀번호
  database: "helper", // 사용할 데이터베이스
});

//INSERT INTO `helper`.`user` (`UID`, `email`, `password`, `name`, `nickname`) VALUES ('1', 'test', 'test', 'test', 'test');
const login = (req, res, next) => {
  const { email, password } = req.body; // 로그인시 받은 이메일과 password를 req바디에서 파싱해서 가져옴
  db.query(
    "SELECT * FROM user WHERE email=? AND password=?;",
    [email, password],
    //콜백함수
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(403).json("Not Authorized");
      } else {
        try {
          // access Token 발급
          console.log(result[0].email);
          const accessToken = jwt.sign(
            // 어떤 정보를 담을지
            {
              id: result[0].UID,
              username: result[0].nickname,
              email: result[0].email,
            },
            process.env.ACCESS_SECRET,
            {
              // 유효기간 및 발행자 설정
              expiresIn: "24h",
              issuer: "About Tech",
            }
          );
          // 클라이언트에 토큰 전송
          res.cookie("accessToken", accessToken, {
            //클라이언트로 전송하는 방법 보안관련하여 설정함
            secure: false,
            httpOnly: true,
          });

          res.status(200).json("login success");
        } catch (error) {
          res.status(505).json(error);
        }
      }
    }
  );
};

const accessToken = (req, res) => {
  try {
    const token = req.cookies.accessToken; // req의 쿠키에서 엑세스 토큰에 접근
    const data = jwt.verify(token, process.env.ACCESS_SECRET); // verify 해줌
    console.log(token);
    console.log(data);
    db.query(
      "SELECT * FROM user WHERE email=? ",
      [data.email],
      // 콜백함수
      (err, result) => {
        if (err) {
          console.log(err);
          res.status(401).json("Not Authorized");
        } else {
          console.log(result[0]);
          // 패스워드는 보여지지 않게 함
          //const { password, ...others } = result[0];
          res.status(200).json(result[0]);
        }
      }
    );
  } catch (error) {
    res.status(500).json(error);
  }
};

/**/
const refreshToken = (req, res) => {
  // 용도 : access token을 갱신.
  try {
    const token = req.cookies.refreshToken;
    const data = jwt.verify(token, process.env.REFRECH_SECRET);
    const userData = userDatabase.filter((item) => {
      return item.email === data.email;
    })[0];

    // access Token 새로 발급
    const accessToken = jwt.sign(
      {
        id: userData.id,
        username: userData.username,
        email: userData.email,
      },
      process.env.ACCESS_SECRET,
      {
        expiresIn: "24h",
        issuer: "About Tech",
      }
    );

    res.cookie("accessToken", accessToken, {
      secure: false,
      httpOnly: true,
    });

    res.status(200).json("Access Token Recreated");
  } catch (error) {
    res.status(500).json(error);
  }
};

const loginSuccess = (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const data = jwt.verify(token, process.env.ACCESS_SECRET);

    db.query(
      "SELECT * FROM user WHERE email=? ",
      [data.email],
      //콜백함수
      (err, result) => {
        if (err) {
          console.log(err);
          res.status(407).json("Not Authorized");
        } else {
          res.status(200).json(result[0]);
        }
      }
    );
  } catch (error) {
    res.status(500).json(error);
  }
};

const logout = (req, res) => {
  try {
    res.cookie("accessToken", "");
    res.status(200).json("Logout Success");
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = {
  // 작성된 함수를 모듈화해서 내보냄
  login,
  accessToken,
  refreshToken,
  loginSuccess,
  logout,
};
