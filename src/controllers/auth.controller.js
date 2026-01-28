const authService = require("../services/auth.service");

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.login(email, password);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
