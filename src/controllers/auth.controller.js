const authService = require("../services/auth.service");

const login = async (req, res, next) => {
  try {
    const { email, phoneNumber, password } = req.body;

    const data = await authService.login({ email, phoneNumber, password });
    res.status(200).json({
      message: "Login successful",
      data
    });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const data = await authService.changePassword({
      userId: req.user.userId,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword
    });
    res.status(200).json({
      message: "Password changed successfully",
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  changePassword
};
